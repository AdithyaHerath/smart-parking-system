import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:smart_parking/models/user_model.dart';

class SupabaseService {
  static final SupabaseClient _client = Supabase.instance.client;

  /// Fetches a user profile from the 'profiles' table by matching the email address.
  static Future<UserModel?> fetchProfile(String email) async {
    try {
      final response = await _client
          .from('profiles')
          .select()
          .eq('email', email)
          .single();
      
      return UserModel(
        id: response['id']?.toString() ?? '',
        studentId: response['student_id']?.toString() ?? '',
        name: response['name']?.toString() ?? '',
        phone: response['phone']?.toString() ?? '',
        email: response['email']?.toString() ?? '',
        status: response['status']?.toString() ?? 'active',
      );
    } catch (e) {
      print('Error fetching profile: $e');
      return null;
    }
  }
}
