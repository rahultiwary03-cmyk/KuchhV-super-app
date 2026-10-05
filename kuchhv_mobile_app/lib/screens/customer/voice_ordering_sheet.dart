import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../services/voice_intent_parser.dart';
import '../../services/voice_speech_service.dart';

class VoiceOrderingSheet extends StatefulWidget {
  const VoiceOrderingSheet({
    required this.catalog,
    required this.onAddToCart,
    required this.onClearCart,
    required this.hasItemsInCart,
    super.key,
  });

  final List<VoiceCatalogItem> catalog;
  final void Function(VoiceOrderLine line) onAddToCart;
  final VoidCallback onClearCart;
  final bool hasItemsInCart;

  @override
  State<VoiceOrderingSheet> createState() => _VoiceOrderingSheetState();
}

class _VoiceOrderingSheetState extends State<VoiceOrderingSheet> {
  final VoiceSpeechService _speech = VoiceSpeechService.instance;
  final VoiceIntentParser _parser = VoiceIntentParser();
  final TextEditingController _textController = TextEditingController();
  late final StreamSubscription<Map<String, dynamic>> _voiceEvents;
  List<VoiceLocale> _locales = [];
  String? _localeId;
  String? _message;
  VoiceOrderIntent? _intent;
  bool _initialized = false;
  bool _initializing = false;
  bool _speaking = false;
  bool _isListening = false;

  @override
  void initState() {
    super.initState();
    _voiceEvents = _speech.events.listen(_onVoiceEvent);
    unawaited(_initializeSpeech());
  }

  @override
  void dispose() {
    _textController.dispose();
    unawaited(_speech.stop());
    unawaited(_speech.stopSpeaking());
    unawaited(_voiceEvents.cancel());
    super.dispose();
  }

  void _onVoiceEvent(Map<String, dynamic> event) {
    if (!mounted) return;
    switch (event['type']) {
      case 'status':
        setState(() {
          _isListening = event['status'] == 'listening';
          if (event['status'] == 'stopped') _isListening = false;
        });
        return;
      case 'result':
        final words = event['words'] as String? ?? '';
        setState(() {
          _textController.text = words;
          _intent = _parser.parse(words, widget.catalog);
          _message = _intent!.hasAction
              ? null
              : 'I could not match an item yet. Try saying an item name and quantity.';
        });
        if (event['final'] == true && _intent!.hasAction) {
          unawaited(_speakConfirmation());
        }
        return;
      case 'error':
        setState(() {
          _isListening = false;
          _message = event['message'] as String? ?? 'Speech recognition failed.';
        });
        return;
      case 'speechComplete':
        setState(() => _speaking = false);
        return;
      case 'speechError':
        setState(() {
          _speaking = false;
          _message = event['message'] as String? ??
              'Text-to-speech is unavailable for this language.';
        });
        return;
    }
  }

  Future<void> _initializeSpeech() async {
    if (_initializing || _initialized) return;
    setState(() {
      _initializing = true;
      _message = null;
    });
    try {
      final available = await _speech.initialize();
      final locales = available ? await _speech.locales() : <VoiceLocale>[];
      if (!mounted) return;
      setState(() {
        _initialized = available;
        _initializing = false;
        _locales = locales;
        _localeId = _preferredLocale(locales)?.localeId;
        if (!available) {
          _message =
              'Speech recognition is unavailable. Check microphone permission and device speech services.';
        } else if (_localeId == null) {
          _message = 'No speech-recognition locales are available on this device.';
        }
      });
    } on PlatformException catch (error) {
      if (mounted) {
        setState(() {
          _initializing = false;
          _message = error.message ?? 'Could not initialize speech recognition.';
        });
      }
    }
  }

  VoiceLocale? _preferredLocale(List<VoiceLocale> locales) {
    for (final preferred in ['hi-in', 'en-in', 'bn-in', 'ta-in']) {
      for (final locale in locales) {
        if (locale.localeId.toLowerCase().replaceAll('_', '-') == preferred) {
          return locale;
        }
      }
    }
    for (final locale in locales) {
      if (locale.localeId.toLowerCase().startsWith('en')) return locale;
    }
    return locales.isEmpty ? null : locales.first;
  }

  Future<void> _toggleListening() async {
    if (_isListening) {
      await _speech.stop();
      return;
    }
    if (!_initialized || _localeId == null) {
      await _initializeSpeech();
    }
    final localeId = _localeId;
    if (!_initialized || localeId == null) return;
    setState(() {
      _message = null;
      _intent = null;
    });
    try {
      await _speech.listen(localeId);
    } on PlatformException catch (error) {
      if (mounted) {
        setState(() => _message = error.message ?? 'Could not start listening.');
      }
    }
  }

  void _onTextChanged(String value) {
    setState(() {
      _intent = _parser.parse(value, widget.catalog);
      _message = _intent!.hasAction
          ? null
          : 'Try: “two atta and one butter, then checkout.”';
    });
  }

  Future<void> _speakConfirmation() async {
    final intent = _intent;
    if (intent == null || !intent.hasAction) return;
    final selectedLocale = _localeId ?? 'en-US';
    final languageCode = selectedLocale.split(RegExp('[-_]')).first;
    final summary = intent.lines
        .map((line) => '${line.quantity} ${line.item.name}')
        .join(', ');
    final subtotal = intent.lines.fold<double>(
      0,
      (total, line) => total + (line.item.price ?? 0) * line.quantity,
    );
    final totalSpoken = 'Estimated item total rupees ${subtotal.toStringAsFixed(0)}.';
    final spokenText = switch (languageCode) {
      'hi' => intent.clearCart
          ? 'क्या आप अपना कार्ट खाली करना चाहते हैं?'
          : intent.lines.isEmpty
              ? 'क्या आप चेकआउट पर जाना चाहते हैं?'
              : 'कार्ट में $summary जोड़ने के लिए पुष्टि करें. $totalSpoken',
      'bn' => intent.clearCart
          ? 'আপনি কি কার্ট খালি করতে চান?'
          : intent.lines.isEmpty
              ? 'আপনি কি চেকআউটে যেতে চান?'
              : 'কার্টে $summary যোগ করতে নিশ্চিত করুন। $totalSpoken',
      'ta' => intent.clearCart
          ? 'கார்ட்டை காலி செய்ய விரும்புகிறீர்களா?'
          : intent.lines.isEmpty
              ? 'செக்அவுட்டிற்குச் செல்ல விரும்புகிறீர்களா?'
              : 'கார்ட்டில் $summary சேர்க்க உறுதிப்படுத்தவும். $totalSpoken',
      _ => intent.clearCart
          ? 'Confirm if you want to empty your cart.'
          : intent.lines.isEmpty
              ? 'Confirm if you want to continue to checkout.'
              : 'Confirm adding $summary to your cart. $totalSpoken',
    };
    try {
      if (mounted) setState(() => _speaking = true);
      await _speech.speak(spokenText, selectedLocale);
    } on PlatformException {
      if (mounted) {
        setState(() {
          _speaking = false;
          _message = 'Text-to-speech is unavailable for this installed language.';
        });
      }
    }
  }

  void _confirmIntent() {
    final intent = _intent;
    if (intent == null || !intent.hasAction) return;
    for (final line in intent.lines) {
      final stock = line.item.stock;
      final inCart = intent.clearCart ? 0 : line.item.alreadyInCart;
      if (stock != null && line.quantity + inCart > stock) {
        setState(
          () => _message =
              'Only ${stock - inCart} of ${line.item.name} are available to add.',
        );
        return;
      }
    }
    if (intent.checkout &&
        intent.lines.isEmpty &&
        (intent.clearCart || !widget.hasItemsInCart)) {
      setState(() => _message = 'Add an item before continuing to checkout.');
      return;
    }
    if (intent.clearCart) widget.onClearCart();
    for (final line in intent.lines) {
      widget.onAddToCart(line);
    }
    Navigator.of(context).pop(intent.checkout);
  }

  String _linePrice(VoiceOrderLine line) {
    final price = line.item.price;
    return price == null
        ? ''
        : ' · ₹${(price * line.quantity).toStringAsFixed(0)}';
  }

  @override
  Widget build(BuildContext context) {
    final intent = _intent;
    final isListening = _isListening;
    final supportedLocales = _locales;
    final canConfirm = intent != null &&
        intent.hasAction &&
        (!intent.checkout ||
            intent.lines.isNotEmpty ||
            (widget.hasItemsInCart && !intent.clearCart));

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          20,
          8,
          20,
          MediaQuery.of(context).viewInsets.bottom + 20,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 38,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.black26,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Text(
                'Talk to KuchhV',
                style: Theme.of(context)
                    .textTheme
                    .titleLarge
                    ?.copyWith(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 4),
              const Text(
                'Speak Hindi, Hinglish, Bengali, Tamil, or another installed language.',
              ),
              if (supportedLocales.isNotEmpty) ...[
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: supportedLocales.any((locale) => locale.localeId == _localeId)
                      ? _localeId
                      : null,
                  decoration: const InputDecoration(
                    labelText: 'Speech language',
                    border: OutlineInputBorder(),
                  ),
                  items: supportedLocales
                      .map(
                        (locale) => DropdownMenuItem(
                          value: locale.localeId,
                          child: Text('${locale.name} (${locale.localeId})'),
                        ),
                      )
                      .toList(),
                  onChanged: isListening
                      ? null
                      : (value) => setState(() => _localeId = value),
                ),
              ],
              const SizedBox(height: 14),
              TextField(
                controller: _textController,
                onChanged: _onTextChanged,
                minLines: 1,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Speak or type an order',
                  hintText: 'For example: दो आटा और एक मक्खन, चेकआउट',
                  border: OutlineInputBorder(),
                ),
              ),
              if (_message != null) ...[
                const SizedBox(height: 8),
                Text(
                  _message!,
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.error,
                    fontSize: 12,
                  ),
                ),
              ],
              const SizedBox(height: 12),
              if (intent != null && intent.lines.isNotEmpty)
                Card(
                  child: Column(
                    children: [
                      for (final line in intent.lines)
                        ListTile(
                          dense: true,
                          title: Text(line.item.name),
                          subtitle: Text(line.item.category),
                          trailing: Text(
                            '× ${line.quantity}${_linePrice(line)}',
                          ),
                        ),
                    ],
                  ),
                ),
              if (intent?.clearCart == true)
                const ListTile(
                  leading: Icon(Icons.remove_shopping_cart_outlined),
                  title: Text('Empty current cart'),
                ),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _initializing ? null : _toggleListening,
                      icon: Icon(
                        isListening ? Icons.stop_circle_outlined : Icons.mic,
                      ),
                      label: Text(
                        _initializing
                            ? 'Starting…'
                            : isListening
                                ? 'Stop listening'
                                : 'Start listening',
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  IconButton(
                    tooltip: _speaking ? 'Speaking confirmation' : 'Play confirmation',
                    onPressed: intent?.hasAction == true ? _speakConfirmation : null,
                    icon: Icon(_speaking ? Icons.volume_up : Icons.record_voice_over),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: canConfirm ? _confirmIntent : null,
                  icon: Icon(
                    intent?.checkout == true
                        ? Icons.shopping_cart_checkout
                        : Icons.add_shopping_cart,
                  ),
                  label: Text(
                    intent?.checkout == true
                        ? 'Confirm & continue to checkout'
                        : intent?.clearCart == true
                            ? 'Confirm cart change'
                            : 'Confirm & add to cart',
                  ),
                  style: FilledButton.styleFrom(backgroundColor: _voiceOrange),
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Items are only added after you confirm. Checkout still requires a separate order confirmation.',
                style: TextStyle(color: Colors.black54, fontSize: 11),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

const _voiceOrange = Color(0xFFFF5722);
