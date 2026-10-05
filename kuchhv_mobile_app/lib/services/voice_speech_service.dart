import 'package:flutter/services.dart';
import 'package:speech_to_text/speech_recognition_error.dart';
import 'package:speech_to_text/speech_recognition_result.dart';
import 'package:speech_to_text/speech_to_text.dart';

class VoiceSpeechService {
  VoiceSpeechService._();

  static final instance = VoiceSpeechService._();

  final SpeechToText _speech = SpeechToText();
  Future<bool>? _initialization;
  void Function(String status)? _onStatus;
  void Function(SpeechRecognitionError error)? _onError;
  void Function(SpeechRecognitionResult result)? _onResult;

  bool get isListening => _speech.isListening;

  Future<bool> initialize({
    required void Function(String status) onStatus,
    required void Function(SpeechRecognitionError error) onError,
    required void Function(SpeechRecognitionResult result) onResult,
  }) async {
    _onStatus = onStatus;
    _onError = onError;
    _onResult = onResult;
    final activeInitialization = _initialization;
    if (activeInitialization != null) return activeInitialization;

    final pendingInitialization = _speech.initialize(
      onStatus: (status) => _onStatus?.call(status),
      onError: (error) => _onError?.call(error),
    );
    _initialization = pendingInitialization;
    try {
      final available = await pendingInitialization;
      if (!available) _initialization = null;
      return available;
    } on PlatformException {
      _initialization = null;
      rethrow;
    }
  }

  Future<List<LocaleName>> locales() => _speech.locales();

  Future<void> listen({
    required String localeId,
    required void Function(SpeechRecognitionResult result) onResult,
  }) async {
    _onResult = onResult;
    await _speech.listen(
      onResult: (result) => _onResult?.call(result),
      listenOptions: SpeechListenOptions(
        cancelOnError: true,
        partialResults: true,
        listenMode: ListenMode.dictation,
        localeId: localeId,
        listenFor: const Duration(seconds: 30),
        pauseFor: const Duration(seconds: 3),
      ),
    );
  }

  Future<void> stop() => _speech.stop();

  void detach() {
    _onStatus = null;
    _onError = null;
    _onResult = null;
  }
}
