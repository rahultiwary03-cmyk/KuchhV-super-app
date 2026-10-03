# KuchhV mobile app

This folder contains the Flutter app source for customer, vendor, and delivery
partner starter screens. The Flutter SDK was not available when this scaffold
was prepared, so native platform folders and `pubspec.lock` have not yet been
generated.

After installing Flutter, run these commands from this folder:

```sh
flutter create --platforms=android,ios .
flutter pub get
flutter run --dart-define=API_BASE_URL=https://kuchhv-super-app-production.up.railway.app
```

The production URL is also the Socket.IO base URL. Configure any WebSocket
client to connect to the same `API_BASE_URL` and provide the access token
during its handshake. For staging or another deployment, override the URL with
the `API_BASE_URL` Dart define.
