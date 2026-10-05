import 'dart:convert';

import 'package:http/http.dart' as http;

class ApiService {
  ApiService({
    http.Client? client,
    String baseUrl = const String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'https://kuchhv-super-app-production.up.railway.app',
    ),
  })  : _client = client ?? http.Client(),
        _baseUrl = baseUrl.replaceFirst(RegExp(r'/+$'), '');

  final http.Client _client;
  final String _baseUrl;

  Future<dynamic> get(String path, {String? accessToken}) async {
    final response = await _client
        .get(_uri(path), headers: _headers(accessToken))
        .timeout(const Duration(seconds: 15));
    return _decodeResponse(response);
  }

  Future<dynamic> post(
    String path, {
    Map<String, dynamic>? body,
    String? accessToken,
  }) async {
    final response = await _client
        .post(
          _uri(path),
          headers: _headers(accessToken),
          body: jsonEncode(body ?? <String, dynamic>{}),
        )
        .timeout(const Duration(seconds: 15));
    return _decodeResponse(response);
  }

  Future<dynamic> patch(
    String path, {
    Map<String, dynamic>? body,
    String? accessToken,
  }) async {
    final response = await _client
        .patch(
          _uri(path),
          headers: _headers(accessToken),
          body: jsonEncode(body ?? <String, dynamic>{}),
        )
        .timeout(const Duration(seconds: 15));
    return _decodeResponse(response);
  }

  Future<dynamic> put(
    String path, {
    Map<String, dynamic>? body,
    String? accessToken,
  }) async {
    final response = await _client
        .put(
          _uri(path),
          headers: _headers(accessToken),
          body: jsonEncode(body ?? <String, dynamic>{}),
        )
        .timeout(const Duration(seconds: 15));
    return _decodeResponse(response);
  }

  Uri _uri(String path) {
    final normalizedPath = path.startsWith('/') ? path : '/$path';
    return Uri.parse('$_baseUrl$normalizedPath');
  }

  Map<String, String> _headers(String? accessToken) => {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        if (accessToken != null) 'Authorization': 'Bearer $accessToken',
      };

  dynamic _decodeResponse(http.Response response) {
    final dynamic decoded =
        response.body.isEmpty ? <String, dynamic>{} : jsonDecode(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = decoded is Map<String, dynamic>
          ? decoded['message']?.toString() ?? 'Request failed'
          : 'Request failed';
      throw ApiException(response.statusCode, message);
    }
    return decoded;
  }
}

class ApiException implements Exception {
  const ApiException(this.statusCode, this.message);

  final int statusCode;
  final String message;

  @override
  String toString() => 'API request failed ($statusCode): $message';
}
