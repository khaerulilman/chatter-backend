import { isValidPostId } from "../../entities/Post.js";
import { processRestrictedPosts } from "./processRestrictedPosts.js";

export const makePostUseCases = ({
  idService,
  imageService,
  postRepository,
  walletRepository,
  followRepository,
  userRepository,
}) => {
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
    return processRestrictedPosts(posts, requesterId, {
      followRepository,
      postRepository,
    });
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
    return processRestrictedPosts(posts, requesterId, {
      followRepository,
      postRepository,
    });
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
    const userExists = await userRepository.findUserById(userId);
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
      mediaUrls = [];
      mediaFileids = [];
      for (const mediaFile of files.media) {
        const result = await imageService.upload({
          file: mediaFile.buffer,
          fileName: mediaFile.originalname,
          folder: "/posts/media",
        });
        mediaUrls.push(result.url);
        mediaFileids.push(result.fileId);
      }
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
      hiddenMediaUrls = [];
      hiddenMediaFileids = [];
      for (const mediaFile of hiddenMediaFiles) {
        const hiddenResult = await imageService.upload({
          file: mediaFile.buffer,
          fileName: mediaFile.originalname,
          folder: "/posts/hidden-media",
        });
        hiddenMediaUrls.push(hiddenResult.url);
        hiddenMediaFileids.push(hiddenResult.fileId);
      }
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

    const [processed] = await processRestrictedPosts([post], requesterId, {
      followRepository,
      postRepository,
    });
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

    const received = await postRepository.getPurchasesReceived(
      userId,
      limit,
      offset,
    );
    const sent = await postRepository.getPurchasesSent(userId, limit, offset);

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
