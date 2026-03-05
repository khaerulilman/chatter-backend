export const makeNotificationUseCases = ({
  idService,
  notificationRepository,
}) => {
  const createNotificationService = async ({
    recipient_id,
    actor_id,
    type,
    entity_id = null,
  }) => {
    try {
      if (recipient_id === actor_id) return; // no self-notification
      await notificationRepository.createNotification({
        id: idService.generateId(),
        recipient_id,
        actor_id,
        type,
        entity_id,
      });
    } catch (err) {
      console.error(
        "[Notification] Failed to create notification:",
        err.message,
      );
    }
  };

  const getNotificationsService = async (userId) => {
    return await notificationRepository.findNotificationsByRecipient(userId);
  };

  const getUnreadCountService = async (userId) => {
    return await notificationRepository.countUnreadNotifications(userId);
  };

  const markReadService = async (notificationId, userId) => {
    await notificationRepository.markNotificationRead(notificationId, userId);
  };

  const markAllReadService = async (userId) => {
    await notificationRepository.markAllNotificationsRead(userId);
  };

  const deleteNotificationService = async (notificationId, userId) => {
    await notificationRepository.deleteNotification(notificationId, userId);
  };

  return {
    createNotificationService,
    getNotificationsService,
    getUnreadCountService,
    markReadService,
    markAllReadService,
    deleteNotificationService,
  };
};
