import 'package:smart_parking/models/user_model.dart';
import 'package:smart_parking/services/supabase_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AuthService {
  //Current logged in user
  static UserModel? currentUser;
  static String? lastError;

  //Login method - returns true if login is successful, false otherwise
  static Future<bool> login(String email, String password) async {
    lastError = null;

    if (email.isEmpty || password.isEmpty) {
      lastError = 'Email and password are required.';
      return false;
    }

    try {
      final response = await Supabase.instance.client.auth.signInWithPassword(
        email: email,
        password: password,
      );

      final authUser = response.user;
      if (authUser == null) {
        lastError = 'Sign in failed. Please try again.';
        return false;
      }

      // Prefer profile by auth uid; fallback to email for legacy data.
      final profile =
          await SupabaseService.fetchProfileById(authUser.id) ??
          await SupabaseService.fetchProfile(email);

      if (profile != null) {
        currentUser = profile;
      } else {
        currentUser = UserModel(
          id: authUser.id,
          studentId: authUser.userMetadata?['student_id']?.toString() ?? '',
          name: authUser.userMetadata?['name']?.toString() ?? 'User',
          phone: authUser.userMetadata?['phone']?.toString() ?? '',
          email: authUser.email ?? email,
          status: 'active',
        );
      }

      return true;
    } on AuthException catch (e) {
      lastError = e.message;
      return false;
    } catch (_) {
      lastError = 'Unable to sign in right now. Check internet and try again.';
      return false;
    }
  }

  //Logout method
  static Future<void> logout() async {
    currentUser = null;
    lastError = null;
  }
}
