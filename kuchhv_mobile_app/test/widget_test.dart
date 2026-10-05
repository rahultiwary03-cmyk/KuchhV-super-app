import 'package:flutter_test/flutter_test.dart';
import 'package:kuchhv_mobile_app/main.dart';
import 'package:kuchhv_mobile_app/providers/auth_provider.dart';
import 'package:provider/provider.dart';

void main() {
  testWidgets('KuchhV opens the selected role dashboard in demo mode', (
    tester,
  ) async {
    final auth = AuthProvider()..startDemo(UserRole.customer);

    await tester.pumpWidget(
      ChangeNotifierProvider.value(
        value: auth,
        child: const KuchhVApp(),
      ),
    );

    expect(find.text('Customer demo'), findsOneWidget);
    expect(find.text('OFFLINE DEMO · Sample content only'), findsOneWidget);
    expect(find.text('Switch demo role'), findsNothing);
    expect(find.byTooltip('Log out'), findsOneWidget);
  });
}
