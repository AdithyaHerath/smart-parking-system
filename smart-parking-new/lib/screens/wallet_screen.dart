import 'package:flutter/material.dart';
import 'package:smart_parking/services/auth_service.dart';

class WalletScreen extends StatelessWidget {
  const WalletScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = AuthService.currentUser;

    // Dummy transaction history - will be replaced with real Supabase data later
    final List<Map<String, dynamic>> transactions = [
      {
        "id": "1",
        "type": "topup",
        "amount_lkr": 500,
        "description": "Wallet top up",
        "created_at": "2024-03-10 09:00",
      },
      {
        "id": "2",
        "type": "parking_fee",
        "amount_lkr": -50,
        "description": "Parking fee - Slot C1",
        "created_at": "2024-03-11 10:30",
      },
      {
        "id": "3",
        "type": "parking_fee",
        "amount_lkr": -50,
        "description": "Parking fee - Slot M2",
        "created_at": "2024-03-12 14:00",
      },
      {
        "id": "4",
        "type": "topup",
        "amount_lkr": 1000,
        "description": "Wallet top up",
        "created_at": "2024-03-13 11:00",
      },
      {
        "id": "5",
        "type": "penalty",
        "amount_lkr": -200,
        "description": "Offense #1",
        "created_at": "2024-03-14 09:00",
      },
      {
        "id": "6",
        "type": "refund",
        "amount_lkr": 50,
        "description": "Refund - Cancelled booking",
        "created_at": "2024-03-15 08:30",
      },
    ];

    final int balance = transactions.fold(
      0,
      (sum, t) => sum + (t["amount_lkr"] as int),
    );

    final int totalTopup = transactions
        .where((t) => t["type"] == "topup")
        .fold(0, (sum, t) => sum + (t["amount_lkr"] as int));

    final int totalSpent = transactions
        .where((t) => (t["amount_lkr"] as int) < 0)
        .fold(0, (sum, t) => sum + (t["amount_lkr"] as int));

    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF1565C0), Color(0xFF2E7D32)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Custom AppBar
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 12,
                ),
                child: Row(
                  children: [
                    GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: Colors.white.withOpacity(0.3),
                          ),
                        ),
                        child: const Icon(
                          Icons.arrow_back_ios_rounded,
                          color: Colors.white,
                          size: 20,
                        ),
                      ),
                    ),
                    const Expanded(
                      child: Text(
                        "My Wallet",
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 42),
                  ],
                ),
              ),

              // Balance section on gradient
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 8,
                ),
                child: Column(
                  children: [
                    const Icon(
                      Icons.account_balance_wallet_rounded,
                      color: Colors.white70,
                      size: 36,
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      "Available Balance",
                      style: TextStyle(color: Colors.white70, fontSize: 14),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      "LKR $balance",
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 36,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      user?.name ?? "",
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.7),
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Top up and spent stats
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              vertical: 12,
                              horizontal: 8,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: Colors.white.withOpacity(0.3),
                              ),
                            ),
                            child: Column(
                              children: [
                                const Icon(
                                  Icons.arrow_downward_rounded,
                                  color: Colors.greenAccent,
                                  size: 18,
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  "LKR $totalTopup",
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                  ),
                                ),
                                const Text(
                                  "Total Top Up",
                                  style: TextStyle(
                                    color: Colors.white70,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              vertical: 12,
                              horizontal: 8,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: Colors.white.withOpacity(0.3),
                              ),
                            ),
                            child: Column(
                              children: [
                                const Icon(
                                  Icons.arrow_upward_rounded,
                                  color: Colors.redAccent,
                                  size: 18,
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  "LKR $totalSpent",
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                  ),
                                ),
                                const Text(
                                  "Total Spent",
                                  style: TextStyle(
                                    color: Colors.white70,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // White card
              Expanded(
                child: Container(
                  width: double.infinity,
                  decoration: const BoxDecoration(
                    color: Color(0xFFF8FFF8),
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(30),
                      topRight: Radius.circular(30),
                    ),
                  ),
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 8),

                        // Top up note
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.blue.withOpacity(0.08),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: Colors.blue.withOpacity(0.2),
                            ),
                          ),
                          child: const Row(
                            children: [
                              Icon(
                                Icons.info_outline_rounded,
                                color: Color(0xFF1565C0),
                                size: 18,
                              ),
                              SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  "To top up your wallet, visit the cashier at NSBM.",
                                  style: TextStyle(
                                    color: Color(0xFF1565C0),
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Transaction history
                        const Text(
                          "Transaction History",
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1A1A1A),
                          ),
                        ),
                        const SizedBox(height: 15),

                        transactions.isEmpty
                            ? Center(
                                child: Column(
                                  children: [
                                    const SizedBox(height: 30),
                                    Icon(
                                      Icons.receipt_long_rounded,
                                      size: 60,
                                      color: Colors.grey[300],
                                    ),
                                    const SizedBox(height: 12),
                                    const Text(
                                      "No transactions yet",
                                      style: TextStyle(color: Colors.grey),
                                    ),
                                  ],
                                ),
                              )
                            : ListView.separated(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: transactions.length,
                                separatorBuilder: (_, __) =>
                                    const SizedBox(height: 10),
                                itemBuilder: (context, index) {
                                  final t = transactions[index];
                                  return _transactionCard(t);
                                },
                              ),
                        const SizedBox(height: 20),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _transactionCard(Map<String, dynamic> transaction) {
    final type = transaction["type"] as String;
    final amount = transaction["amount_lkr"] as int;
    final isCredit = amount > 0;
    final color = _typeColor(type);
    final icon = _typeIcon(type);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Row(
        children: [
          // Icon
          Container(
            width: 45,
            height: 45,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 14),

          // Details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  transaction["description"] as String,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(
                      Icons.access_time_rounded,
                      size: 12,
                      color: Colors.grey,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      transaction["created_at"] as String,
                      style: const TextStyle(color: Colors.grey, fontSize: 12),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Amount
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                "${isCredit ? '+' : ''}LKR $amount",
                style: TextStyle(
                  color: isCredit ? Colors.green : Colors.red,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  type.replaceAll('_', ' '),
                  style: TextStyle(
                    color: color,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Color _typeColor(String type) {
    switch (type) {
      case "topup":
        return Colors.green;
      case "parking_fee":
        return const Color(0xFF1565C0);
      case "penalty":
        return Colors.red;
      case "walkin_surcharge":
        return Colors.orange;
      case "refund":
        return Colors.teal;
      default:
        return Colors.grey;
    }
  }

  IconData _typeIcon(String type) {
    switch (type) {
      case "topup":
        return Icons.add_circle_outline_rounded;
      case "parking_fee":
        return Icons.local_parking_rounded;
      case "penalty":
        return Icons.warning_amber_rounded;
      case "walkin_surcharge":
        return Icons.directions_walk_rounded;
      case "refund":
        return Icons.refresh_rounded;
      default:
        return Icons.receipt_rounded;
    }
  }
}
