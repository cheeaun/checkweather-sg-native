import Analytics from 'appcenter-analytics';

export default (eventName, properties = {}) => {
  if (__DEV__) {
    console.info('EVENT', eventName, properties);
  } else {
    Analytics.trackEvent(eventName, properties);
  }
};
