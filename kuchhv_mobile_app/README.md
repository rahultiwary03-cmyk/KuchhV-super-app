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

## Voice ordering

The customer home screen includes a short-utterance voice ordering assistant.
Speech recognition uses the device's speech service; recognized text is matched
locally against the grocery, food, and medicine catalog, and text-to-speech
reads back a confirmation. KuchhV does not send audio to a separate speech API;
the operating-system recognizer may process audio online, depending on the
device and its speech-service settings. Available speech locales are provided
by the device and may vary with installed services. The local catalog matcher
includes Hindi, Hinglish, Bengali, Tamil, Marathi, Gujarati, Telugu, Kannada,
Malayalam, and Punjabi item aliases.

Voice intents can add catalog items with quantities, clear the cart, and
request checkout. The assistant previews the interpreted action and only
applies it after the customer taps its confirmation button; placing the demo
order still requires a separate checkout confirmation. The current Flutter
entrypoint is explicitly a demo preview and does not submit orders to the live
backend.

Android speech recognition and speech synthesis use the platform APIs through
Flutter method/event channels implemented in
`tool/MainActivity.kt.template`; there are no speech plugin Gradle
dependencies. The APK workflow installs this activity into the generated
Android project, adds `INTERNET` and `RECORD_AUDIO` permissions plus Android
11+ speech/TTS service queries, and opts out of the AGP 9 new DSL while
upstream Flutter plugins are transitioning. For local Android runs, copy the
template into the generated `MainActivity.kt` package and apply the same
manifest and Gradle property settings. This native voice bridge is Android-only;
iOS builds need a separate native implementation before microphone use.

Run `flutter pub get` and `flutter test` from this folder before building an
APK. On a physical device, grant microphone access and install the desired
regional speech and text-to-speech language data in the system speech services.
