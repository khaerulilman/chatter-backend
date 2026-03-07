import { isValidPostId } from "../../entities/Post.js";

export const makePostUseCases = ({
  idService,
  imageService,
  postRepository,
  walletRepository,
}) => {
  // Strip hidden content from follower-only / paid posts when viewer can't see it
  const processRestrictedPosts = async (posts, requesterId) => {
    return Promise.all(
      posts.map(async (post) => {
        const isRestricted = post.is_follower_only || post.is_paid;
        if (!isRestricted) return post;

        // Owner always sees everything
        if (requesterId && requesterId === post.user_id) {
          return { ...post, is_hidden_unlocked: true };
        }

        let canSeeHidden = false;
        if (requesterId) {
          if (post.is_follower_only) {
            canSeeHidden = await postRepository.checkIsFollowing(
              requesterId,
              post.user_id,
            );
          }
          if (post.is_paid && !canSeeHidden) {
            canSeeHidden = await postRepository.checkHasPurchased(
              requesterId,
              post.id,
            );
          }
        }

        if (canSeeHidden) {
          return { ...post, is_hidden_unlocked: true };
        }

        // Count hidden words and images for the blurred overlay info
        const hiddenWordCount = post.hidden_content
          ? post.hidden_content.split(/\s+/).filter(Boolean).length
          : 0;
        const hiddenImageCount =
          post.hidden_media_urls && Array.isArray(post.hidden_media_urls)
            ? post.hidden_media_urls.length
            : 0;

        return {
          ...post,
          hidden_content: null,
          hidden_media_urls: null,
          is_hidden_unlocked: false,
          hidden_word_count: hiddenWordCount,
          hidden_image_count: hiddenImageCount,
        };
      }),
    );
  };

  const getPostsService = async (page, limit, requesterId) => {
    if (
      typeof page !== "number" ||
      typeof limit !== "number" ||
      page < 1 ||
      limit < 1
    ) {
      throw new Error("Invalid page or limit values");
    }

    const offset = (page - 1) * limit;
    const posts = await postRepository.findAllPosts(limit, offset);
    return processRestrictedPosts(posts, requesterId);
  };

  const getPostsByUserIdService = async (userId, page, limit, requesterId) => {
    if (
      typeof page !== "number" ||
      typeof limit !== "number" ||
      page < 1 ||
      limit < 1
    ) {
      throw new Error("Invalid page or limit values");
    }

    const offset = (page - 1) * limit;
    const posts = await postRepository.findPostsByUserId(userId, limit, offset);
    return processRestrictedPosts(posts, requesterId);
  };

  const createPostService = async (
    userId,
    content,
    files,
    {
      isFollowerOnly,
      isPaid,
      price,
      hiddenContent,
      hiddenMediaFiles,
      commentsDisabled,
    } = {},
  ) => {
    const userExists = await postRepository.findUserById(userId);
    if (!userExists) {
      throw new Error("User not found");
    }

    if (isPaid) {
      const numPrice = Number(price);
      if (!numPrice || numPrice < 5000 || numPrice > 100000) {
        throw new Error("Price must be between Rp 5.000 and Rp 100.000");
      }
    }

    const postId = idService.generateId();

    // Upload public media
    let mediaUrl = null;
    let mediaUrls = null;
    let mediaFileids = null;
    if (files && files.media && files.media.length > 0) {
      const uploadPromises = files.media.map((mediaFile) =>
        imageService.upload({
          file: mediaFile.buffer,
          fileName: mediaFile.originalname,
          folder: "/posts/media",
        }),
      );
      const results = await Promise.all(uploadPromises);
      mediaUrls = results.map((r) => r.url);
      mediaFileids = results.map((r) => r.fileId);
      mediaUrl = mediaUrls[0];
    }

    // Upload hidden media (for follower-only or paid posts)
    let hiddenMediaUrls = null;
    let hiddenMediaFileids = null;
    if (
      (isFollowerOnly || isPaid) &&
      hiddenMediaFiles &&
      hiddenMediaFiles.length > 0
    ) {
      const hiddenUploadPromises = hiddenMediaFiles.map((mediaFile) =>
        imageService.upload({
          file: mediaFile.buffer,
          fileName: mediaFile.originalname,
          folder: "/posts/hidden-media",
        }),
      );
      const hiddenResults = await Promise.all(hiddenUploadPromises);
      hiddenMediaUrls = hiddenResults.map((r) => r.url);
      hiddenMediaFileids = hiddenResults.map((r) => r.fileId);
    }

    const hasRestriction = isFollowerOnly || isPaid;

    const newPost = await postRepository.createPost({
      id: postId,
      user_id: userId,
      content,
      media_url: mediaUrl,
      media_urls: mediaUrls,
      media_fileids: mediaFileids,
      is_follower_only: isFollowerOnly || false,
      hidden_content: hasRestriction ? hiddenContent || null : null,
      hidden_media_urls: hiddenMediaUrls,
      hidden_media_fileids: hiddenMediaFileids,
      is_paid: isPaid || false,
      price: isPaid ? Number(price) : null,
      comments_disabled: commentsDisabled || false,
    });

    return newPost[0];
  };

  const getPostByIdService = async (postId, requesterId) => {
    if (!isValidPostId(postId)) {
      throw new Error("Invalid postId format.");
    }

    const post = await postRepository.getPostByIdWithUser(postId);
    if (!post) {
      throw new Error("Post not found.");
    }

    const [processed] = await processRestrictedPosts([post], requesterId);
    return processed;
  };

  const deletePostService = async (postId, userId) => {
    if (!isValidPostId(postId)) {
      throw new Error("Invalid postId format.");
    }

    const post = await postRepository.getPostByIdWithUser(postId);
    if (!post) {
      throw new Error("Post not found.");
    }

    if (post.user_id !== userId) {
      throw new Error("Unauthorized. Only post owner can delete.");
    }

    // Delete all images (public + hidden) from ImageKit before removing post from DB
    const fileIds = await postRepository.getMediaFileidsByPostId(postId);
    if (fileIds && fileIds.length > 0) {
      try {
        await imageService.deleteFiles(fileIds);
      } catch (err) {
        // Log but don't block post deletion if ImageKit fails
        console.error("Failed to delete images from ImageKit:", err.message);
      }
    }

    const deletedPost = await postRepository.deletePostById(postId);

    return deletedPost;
  };

  const purchasePostService = async (postId, buyerId) => {
    if (!isValidPostId(postId)) {
      throw new Error("Invalid postId format.");
    }

    const post = await postRepository.getPostByIdWithUser(postId);
    if (!post) {
      throw new Error("Post not found.");
    }

    if (!post.is_paid) {
      throw new Error("This post is not a paid post.");
    }

    if (post.user_id === buyerId) {
      throw new Error("You cannot purchase your own post.");
    }

    // Check if already purchased
    const alreadyPurchased = await postRepository.checkHasPurchased(
      buyerId,
      postId,
    );
    if (alreadyPurchased) {
      throw new Error("You have already purchased this post.");
    }

    const price = post.price;

    // Check buyer wallet balance
    const buyerWallet = await walletRepository.getWalletByUserId(buyerId);
    if (!buyerWallet || buyerWallet.balance < price) {
      throw new Error("Insufficient balance.");
    }

    // Deduct from buyer
    await walletRepository.addBalance(buyerId, -price);

    // Credit to post owner
    let ownerWallet = await walletRepository.getWalletByUserId(post.user_id);
    if (!ownerWallet) {
      const walletId = idService.generateId();
      await walletRepository.createWallet(walletId, post.user_id);
    }
    await walletRepository.addBalance(post.user_id, price);

    // Create purchase record
    const purchaseId = idService.generateId();
    await postRepository.createPurchase({
      id: purchaseId,
      userId: buyerId,
      postId,
      amount: price,
    });

    return { message: "Post purchased successfully", amount: price };
  };

  const getPurchaseActivityService = async (userId, page = 1, limit = 20) => {
    const offset = (page - 1) * limit;

    const [received, sent] = await Promise.all([
      postRepository.getPurchasesReceived(userId, limit, offset),
      postRepository.getPurchasesSent(userId, limit, offset),
    ]);

    return { received, sent };
  };

  return {
    getPostsService,
    getPostsByUserIdService,
    createPostService,
    getPostByIdService,
    deletePostService,
    purchasePostService,
    getPurchaseActivityService,
  };
};
