import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:smart_parking/screens/login_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: 'https://ieduoyanviowobfaphmw.supabase.co',
    anonKey: 'sb_publishable_PYOATM8a6rvMwHlhm-Fx9g_O_01_UrC',
  );

  runApp(const SmartParking());
}

class SmartParking extends StatelessWidget {
  const SmartParking({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(useMaterial3: true),
      home: const LoginScreen(),
    );
  }
}
