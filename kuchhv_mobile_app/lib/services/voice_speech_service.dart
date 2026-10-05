import 'dart:async';

import 'package:flutter/services.dart';

class VoiceSpeechService {
  VoiceSpeechService._();

  static final instance = VoiceSpeechService._();

  static const _methods = MethodChannel('com.kuchhv/voice');
  static const _events = EventChannel('com.kuchhv/voice_events');

  Stream<Map<String, dynamic>> get events => _events
      .receiveBroadcastStream()
      .map((event) => Map<String, dynamic>.from(event as Map));

  Future<bool> initialize() async =>
      await _methods.invokeMethod<bool>('initialize') ?? false;

  Future<List<VoiceLocale>> locales() async {
    final result = await _methods.invokeListMethod<Map<dynamic, dynamic>>(
      'getLocales',
    );
    return (result ?? const [])
        .map(
          (locale) => VoiceLocale(
            localeId: locale['localeId'] as String,
            name: locale['name'] as String,
          ),
        )
        .toList();
  }

  Future<void> listen(String localeId) =>
      _methods.invokeMethod<void>('startListening', {'localeId': localeId});

  Future<void> stop() => _methods.invokeMethod<void>('stopListening');

  Future<void> speak(String text, String localeId) =>
      _methods.invokeMethod<void>('speak', {
        'text': text,
        'localeId': localeId,
      });

  Future<void> stopSpeaking() => _methods.invokeMethod<void>('stopSpeaking');
}

class VoiceLocale {
  const VoiceLocale({required this.localeId, required this.name});

  final String localeId;
  final String name;
}
