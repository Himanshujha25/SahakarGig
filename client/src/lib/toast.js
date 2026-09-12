const listeners = new Set();

export const toast = {
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  show(type, message, title) {
    listeners.forEach((fn) =>
      fn({
        id: Date.now() + Math.random(),
        type,
        message,
        title: title || (type === 'success' ? 'Success' : type === 'error' ? 'Error' : type === 'warning' ? 'Attention' : 'Notice'),
      })
    );
  },
  success(message, title = 'Success') {
    this.show('success', message, title);
  },
  error(message, title = 'Error') {
    this.show('error', message, title);
  },
  info(message, title = 'Information') {
    this.show('info', message, title);
  },
  warning(message, title = 'Warning') {
    this.show('warning', message, title);
  },
};

export default toast;
