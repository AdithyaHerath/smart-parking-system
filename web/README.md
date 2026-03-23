# NPark - Parking Slot Booking System

A modern web application designed to streamline and manage university parking slot reservations. 

## Technologies Used
This project is built with a modern frontend stack and powered by a Supabase backend:
* **Frontend:** React, TypeScript, Vite
* **Styling:** Tailwind CSS, shadcn-ui
* **Backend/Database:** Supabase

## Getting Started Locally

To run this project on your local machine, ensure you have [Node.js](https://nodejs.org/) installed, and then follow these steps:

**1. Clone the repository and navigate into the project directory:**
\`\`\`bash
git clone <YOUR_GIT_URL>
cd nsbm-park-assist
\`\`\`

**2. Install the required dependencies (using npm):**
\`\`\`bash
npm install
\`\`\`

**3. Set up your environment variables:**
* Create a `.env.local` file in the root directory.
* Add your Supabase project URL and anonymous key:
  \`\`\`env
  VITE_SUPABASE_URL=your_supabase_url
  VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
  \`\`\`

**4. Start the development server:**
\`\`\`bash
npm run dev
\`\`\`

The application will be available at `http://localhost:8080`.