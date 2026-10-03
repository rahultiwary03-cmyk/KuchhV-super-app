# KuchhV mobile app

This folder contains the Flutter app source for customer, vendor, and delivery
partner starter screens. The Flutter SDK was not available when this scaffold
was prepared, so native platform folders and `pubspec.lock` have not yet been
generated.

After installing Flutter, run these commands from this folder:

```sh
flutter create --platforms=android,ios .
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

`10.0.2.2` reaches the host machine from the Android emulator. For an iOS
simulator or physical device, pass a base URL reachable from that device.
Use HTTPS for deployed APIs.
