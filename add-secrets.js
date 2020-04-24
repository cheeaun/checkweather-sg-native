const fs = require('fs');
const { GOOGLESERVICE_INFO_PLIST, APPCENTER_CONFIG_PLIST } = process.env;

if (GOOGLESERVICE_INFO_PLIST) {
  const file = 'ios/GoogleService-Info.plist';
  fs.writeFileSync(file, GOOGLESERVICE_INFO_PLIST);
  console.log(`Generated ${file}`);
}

if (APPCENTER_CONFIG_PLIST) {
  const file = 'ios/AppCenter-Config.plist';
  fs.writeFileSync(file, APPCENTER_CONFIG_PLIST);
  console.log(`Generated ${file}`);
}
