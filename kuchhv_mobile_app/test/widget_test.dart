import 'package:flutter_test/flutter_test.dart';
import 'package:kuchhv_mobile_app/main.dart';
import 'package:kuchhv_mobile_app/providers/auth_provider.dart';
import 'package:provider/provider.dart';

void main() {
  testWidgets('KuchhV opens the interactive customer demo dashboard', (tester) async {
    final auth = AuthProvider()..startDemo(UserRole.customer);

    await tester.pumpWidget(
      ChangeNotifierProvider.value(
        value: auth,
        child: const KuchhVApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Neighborhood storefront'), findsOneWidget);
    expect(find.text('DEMO MODE · Sample content only'), findsOneWidget);
    expect(find.text('Switch demo role'), findsNothing);
    expect(find.byTooltip('Log out'), findsOneWidget);
    expect(find.text('Categories'), findsNothing);
    expect(find.text('All categories'), findsOneWidget);
  });
}
