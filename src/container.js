// ── Adapter Services (wrap external frameworks) ───────────────────
import * as hashService from "./adapters/services/hash.service.js";
import * as tokenService from "./adapters/services/token.service.js";
import * as idService from "./adapters/services/id.service.js";
import * as imageService from "./adapters/services/image.service.js";
import * as emailService from "./adapters/services/email.service.js";

// ── Repositories (data-access adapters) ───────────────────────────
import * as authRepository from "./adapters/repositories/auth.repository.js";
import * as chatRepository from "./adapters/repositories/chats.repository.js";
import * as commentRepository from "./adapters/repositories/comments.repository.js";
import * as followRepository from "./adapters/repositories/follows.repository.js";
import * as likeRepository from "./adapters/repositories/likes.repository.js";
import * as notificationRepository from "./adapters/repositories/notifications.repository.js";
import * as postRepository from "./adapters/repositories/posts.repository.js";
import * as savedRepository from "./adapters/repositories/saved.repository.js";
import * as userRepository from "./adapters/repositories/users.repository.js";
import * as walletRepository from "./adapters/repositories/wallet.repository.js";
import * as tipsRepository from "./adapters/repositories/tips.repository.js";

// ── Use-Case Factories ────────────────────────────────────────────
import { makeNotificationUseCases } from "./use-cases/notifications/notifications.use-case.js";
import { makeAuthUseCases } from "./use-cases/auth/auth.use-case.js";
import { makeChatUseCases } from "./use-cases/chats/chats.use-case.js";
import { makeCommentUseCases } from "./use-cases/comments/comments.use-case.js";
import { makeFollowUseCases } from "./use-cases/follows/follows.use-case.js";
import { makeLikeUseCases } from "./use-cases/likes/likes.use-case.js";
import { makePostUseCases } from "./use-cases/posts/posts.use-case.js";
import { makeSavedUseCases } from "./use-cases/saved/saved.use-case.js";
import { makeUserUseCases } from "./use-cases/users/users.use-case.js";
import { makeWalletUseCases } from "./use-cases/wallet/wallet.use-case.js";
import { makeTipsUseCases } from "./use-cases/tips/tips.use-case.js";
import * as midtransService from "./adapters/services/midtrans.service.js";

// ── Wire Dependencies ─────────────────────────────────────────────

// Notifications first (other use-cases depend on notifyService)
export const notificationUseCases = makeNotificationUseCases({
  idService,
  notificationRepository,
});

export const authUseCases = makeAuthUseCases({
  authRepository,
  hashService,
  tokenService,
  idService,
  emailService,
});

export const chatUseCases = makeChatUseCases({
  idService,
  imageService,
  chatRepository,
  notifyService: notificationUseCases,
});

export const commentUseCases = makeCommentUseCases({
  idService,
  commentRepository,
  notifyService: notificationUseCases,
});

export const followUseCases = makeFollowUseCases({
  idService,
  followRepository,
  notifyService: notificationUseCases,
});

export const likeUseCases = makeLikeUseCases({
  idService,
  likeRepository,
  notifyService: notificationUseCases,
});

export const postUseCases = makePostUseCases({
  idService,
  imageService,
  postRepository,
});

export const savedUseCases = makeSavedUseCases({
  savedRepository,
});

export const userUseCases = makeUserUseCases({
  hashService,
  imageService,
  userRepository,
});

export const walletUseCases = makeWalletUseCases({
  idService,
  walletRepository,
  midtransService,
});

export const tipsUseCases = makeTipsUseCases({
  idService,
  tipsRepository,
  walletRepository,
  notifyService: notificationUseCases,
});
