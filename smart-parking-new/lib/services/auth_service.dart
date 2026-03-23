import 'package:smart_parking/models/user_model.dart';
import 'package:smart_parking/services/supabase_service.dart';

class AuthService {
  //Current logged in user
  static UserModel? currentUser;

  //Login method - returns true if login is successful, false otherwise
  static Future<bool> login(String email, String password) async {
    if (email.isEmpty || password.isEmpty) {
      return false;
    }

    // Fetch the user profile from Supabase profiles table
    final profile = await SupabaseService.fetchProfile(email);

    if (profile != null) {
      currentUser = profile;
      return true;
    }
    
    // TEMPORARY BYPASS LOGIN: since you cannot access Supabase right now, 
    // Type 'test' as email and 'test' as password to bypass login and test the app UI!
    if (email == 'test' && password == 'test') {
      currentUser = UserModel(
        id: 'debug-id',
        studentId: '12345',
        name: 'Test Tester',
        phone: '0712345678',
        email: 'test@students.nsbm.ac.lk',
        status: 'active',
      );
      return true;
    }
    
    return false;
  }

  //Logout method
  static Future<void> logout() async {
    currentUser = null;
  }
}
