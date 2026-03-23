import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:smart_parking/models/user_model.dart';

class SupabaseService {
  static final SupabaseClient _client = Supabase.instance.client;

  /// Fetches a user profile from the 'profiles' table by matching the auth user id.
  static Future<UserModel?> fetchProfileById(String userId) async {
    try {
      final response = await _client
          .from('profiles')
          .select()
          .eq('id', userId)
          .maybeSingle();

      if (response == null) {
        return null;
      }

      return UserModel.fromMap(response);
    } catch (e) {
      print('Error fetching profile by id: $e');
      return null;
    }
  }

  /// Fetches a user profile from the 'profiles' table by matching the email address.
  static Future<UserModel?> fetchProfile(String email) async {
    try {
      final response = await _client
          .from('profiles')
          .select()
          .eq('email', email)
          .maybeSingle();

      if (response == null) {
        return null;
      }

      return UserModel.fromMap(response);
    } catch (e) {
      print('Error fetching profile: $e');
      return null;
    }
  }
}
