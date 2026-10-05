import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:kuchhv_mobile_app/services/api_service.dart';

void main() {
  test('uses the Railway API by default and sends bearer tokens', () async {
    Uri? requestedUri;
    String? authorization;
    final api = ApiService(
      client: MockClient((request) async {
        requestedUri = request.url;
        authorization = request.headers['Authorization'];
        return http.Response('[{"id":"order-1"}]', 200);
      }),
    );

    final result = await api.get('/orders/customer', accessToken: 'access-token');

    expect(
      requestedUri,
      Uri.parse(
        'https://kuchhv-super-app-production.up.railway.app/orders/customer',
      ),
    );
    expect(authorization, 'Bearer access-token');
    expect(result, [
      {'id': 'order-1'},
    ]);
  });
}
