import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'providers/auth_provider.dart';
import 'providers/cart_provider.dart';
import 'screens/app_home_screen.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()..restoreSession()),
        ChangeNotifierProvider(create: (_) => CartProvider()),
      ],
      child: const KuchhVApp(),
    ),
  );
}

class KuchhVApp extends StatelessWidget {
  const KuchhVApp({super.key});

  @override
  Widget build(BuildContext context) {
    const brandGreen = Color(0xFF167D5A);

    return MaterialApp(
      title: 'KuchhV',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: brandGreen,
          primary: brandGreen,
          surface: const Color(0xFFF8FAF8),
        ),
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFF8FAF8),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFFF8FAF8),
          foregroundColor: Color(0xFF17352B),
          centerTitle: false,
        ),
      ),
      home: const AppHomeScreen(),
    );
  }
}
