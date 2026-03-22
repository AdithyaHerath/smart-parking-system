import 'package:flutter/material.dart';

class BookingScreen extends StatefulWidget {
  const BookingScreen({super.key});

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  // Dummy slot data - will be replaced with real Supabase data later
  final List<Map<String, dynamic>> _slots = [
    {"code": "C1", "type": "car", "status": "free"},
    {"code": "C2", "type": "car", "status": "booked"},
    {"code": "C3", "type": "car", "status": "free"},
    {"code": "C4", "type": "car", "status": "arrived"},
    {"code": "C5", "type": "car", "status": "free"},
    {"code": "C6", "type": "car", "status": "booked"},
    {"code": "C7", "type": "car", "status": "free"},
    {"code": "C8", "type": "car", "status": "free"},
    {"code": "C9", "type": "car", "status": "arrived"},
    {"code": "C10", "type": "car", "status": "free"},
    {"code": "C11", "type": "car", "status": "booked"},
    {"code": "C12", "type": "car", "status": "free"},
    {"code": "C13", "type": "car", "status": "free"},
    {"code": "C14", "type": "car", "status": "booked"},
    {"code": "C15", "type": "car", "status": "free"},
    {"code": "C16", "type": "car", "status": "free"},
    {"code": "C17", "type": "car", "status": "arrived"},
    {"code": "C18", "type": "car", "status": "free"},
    {"code": "C19", "type": "car", "status": "booked"},
    {"code": "C20", "type": "car", "status": "free"},
    {"code": "M1", "type": "motorbike", "status": "free"},
    {"code": "M2", "type": "motorbike", "status": "booked"},
    {"code": "M3", "type": "motorbike", "status": "free"},
    {"code": "M4", "type": "motorbike", "status": "free"},
    {"code": "M5", "type": "motorbike", "status": "arrived"},
    {"code": "M6", "type": "motorbike", "status": "free"},
    {"code": "M7", "type": "motorbike", "status": "booked"},
    {"code": "M8", "type": "motorbike", "status": "free"},
    {"code": "M9", "type": "motorbike", "status": "free"},
    {"code": "M10", "type": "motorbike", "status": "booked"},
    {"code": "M11", "type": "motorbike", "status": "free"},
    {"code": "M12", "type": "motorbike", "status": "free"},
    {"code": "M13", "type": "motorbike", "status": "arrived"},
    {"code": "M14", "type": "motorbike", "status": "free"},
    {"code": "M15", "type": "motorbike", "status": "booked"},
    {"code": "M16", "type": "motorbike", "status": "free"},
    {"code": "M17", "type": "motorbike", "status": "free"},
    {"code": "M18", "type": "motorbike", "status": "booked"},
    {"code": "M19", "type": "motorbike", "status": "free"},
    {"code": "M20", "type": "motorbike", "status": "free"},
  ];

  String _filter = "all"; // all, free, booked, arrived

  List<Map<String, dynamic>> get _carSlots =>
      _slots.where((s) => s["type"] == "car").toList();

  List<Map<String, dynamic>> get _bikeSlots =>
      _slots.where((s) => s["type"] == "motorbike").toList();

  int get _freeCount => _slots.where((s) => s["status"] == "free").length;

  int get _bookedCount => _slots.where((s) => s["status"] == "booked").length;

  int get _arrivedCount => _slots.where((s) => s["status"] == "arrived").length;

  void _showSlotDetails(Map<String, dynamic> slot) {
    final status = slot["status"] as String;
    final isFree = status == "free";
    final color = _statusColor(status);

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle bar
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),

            // Slot icon
            Container(
              width: 70,
              height: 70,
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: color, width: 2),
              ),
              child: Center(
                child: Icon(
                  slot["type"] == "car"
                      ? Icons.directions_car_rounded
                      : Icons.two_wheeler_rounded,
                  color: color,
                  size: 35,
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Slot code
            Text(
              "Slot ${slot["code"]}",
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),

            // Status badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: color),
              ),
              child: Text(
                status.toUpperCase(),
                style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              slot["type"] == "car" ? "Car Slot" : "Motorbike Slot",
              style: const TextStyle(color: Colors.grey, fontSize: 14),
            ),
            const SizedBox(height: 24),

            // Action button
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: isFree
                    ? () {
                        Navigator.pop(context);
                        // TODO: navigate to car park screen with pre-selected slot
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              "Slot ${slot["code"]} selected for booking!",
                            ),
                            backgroundColor: Colors.green,
                            behavior: SnackBarBehavior.floating,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                        );
                      }
                    : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2E7D32),
                  disabledBackgroundColor: Colors.grey[200],
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(
                  isFree ? "Book This Slot" : "Slot Unavailable",
                  style: TextStyle(
                    color: isFree ? Colors.white : Colors.grey,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 10),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FFF8),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF8FFF8),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Color(0xFF2E7D32)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          "Parking Map",
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: Color(0xFF1A1A1A),
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Stats bar
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _statItem("Free", _freeCount, Colors.green),
                  _divider(),
                  _statItem("Booked", _bookedCount, Colors.blue),
                  _divider(),
                  _statItem("Arrived", _arrivedCount, Colors.orange),
                  _divider(),
                  _statItem("Total", _slots.length, Colors.grey),
                ],
              ),
            ),

            // Filter chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  _filterChip("all", "All"),
                  const SizedBox(width: 8),
                  _filterChip("free", "Free"),
                  const SizedBox(width: 8),
                  _filterChip("booked", "Booked"),
                  const SizedBox(width: 8),
                  _filterChip("arrived", "Arrived"),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Legend
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  _legendItem(Colors.green, "Free"),
                  const SizedBox(width: 16),
                  _legendItem(Colors.blue, "Booked"),
                  const SizedBox(width: 16),
                  _legendItem(Colors.orange, "Arrived"),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Car slots section
            _sectionHeader(
              "🚗  Car Slots",
              _carSlots.where((s) => s["status"] == "free").length,
              _carSlots.length,
            ),
            const SizedBox(height: 12),
            _parkingGrid(_carSlots),
            const SizedBox(height: 24),

            // Road divider
            _roadDivider(),
            const SizedBox(height: 24),

            // Motorbike slots section
            _sectionHeader(
              "🏍️  Motorbike Slots",
              _bikeSlots.where((s) => s["status"] == "free").length,
              _bikeSlots.length,
            ),
            const SizedBox(height: 12),
            _parkingGrid(_bikeSlots),
            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  Widget _parkingGrid(List<Map<String, dynamic>> slots) {
    final filtered = _filter == "all"
        ? slots
        : slots.where((s) => s["status"] == _filter).toList();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 5,
          crossAxisSpacing: 8,
          mainAxisSpacing: 8,
          childAspectRatio: 0.85,
        ),
        itemCount: filtered.length,
        itemBuilder: (context, index) {
          final slot = filtered[index];
          final status = slot["status"] as String;
          final color = _statusColor(status);
          final isCar = slot["type"] == "car";

          return GestureDetector(
            onTap: () => _showSlotDetails(slot),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: color, width: 1.5),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    isCar
                        ? Icons.directions_car_rounded
                        : Icons.two_wheeler_rounded,
                    color: color,
                    size: isCar ? 22 : 18,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    slot["code"] as String,
                    style: TextStyle(
                      color: color,
                      fontWeight: FontWeight.bold,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _sectionHeader(String title, int free, int total) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1A1A1A),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.green.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.green),
            ),
            child: Text(
              "$free / $total free",
              style: const TextStyle(
                color: Colors.green,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _roadDivider() {
    return Container(
      height: 30,
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.grey[300],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: List.generate(
          8,
          (index) => Container(
            width: 20,
            height: 4,
            margin: const EdgeInsets.symmetric(horizontal: 6),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        ),
      ),
    );
  }

  Widget _statItem(String label, int count, Color color) {
    return Column(
      children: [
        Text(
          count.toString(),
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }

  Widget _divider() {
    return Container(width: 1, height: 30, color: Colors.grey[200]);
  }

  Widget _filterChip(String value, String label) {
    final isSelected = _filter == value;
    return GestureDetector(
      onTap: () => setState(() => _filter = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF2E7D32) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFF2E7D32) : Colors.grey[300]!,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : Colors.grey,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            fontSize: 13,
          ),
        ),
      ),
    );
  }

  Widget _legendItem(Color color, String label) {
    return Row(
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(3),
          ),
        ),
        const SizedBox(width: 5),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }

  Color _statusColor(String status) {
    switch (status) {
      case "booked":
        return Colors.blue;
      case "arrived":
        return Colors.orange;
      case "free":
      default:
        return Colors.green;
    }
  }
}
