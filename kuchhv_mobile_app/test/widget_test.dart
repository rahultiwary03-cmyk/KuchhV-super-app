import 'package:flutter_test/flutter_test.dart';
import 'package:kuchhv_mobile_app/main.dart';
import 'package:provider/provider.dart';

void main() {
  testWidgets('KuchhV app opens on the customer storefront', (tester) async {
    await tester.pumpWidget(
      ChangeNotifierProvider(
        create: (_) => DemoAppState(),
        child: const KuchhVApp(),
      ),
    );

    expect(find.text('KuchhV'), findsOneWidget);
  });
}
