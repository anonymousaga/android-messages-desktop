const OldNotification = Notification;

window.Notification = function (title, options) {
  console.log(title, options);

  const notification = new OldNotification(title, options);

  return notification;
}
window.Notification.permission = OldNotification.permission;
window.Notification.requestPermission = OldNotification.requestPermission;
