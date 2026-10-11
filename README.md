# PrintLagbe

Motion storefront and quote-request MVP for PrintLagbe.

## Features

- Browse motion products
- Request quotes for custom orders
- User authentication with Supabase
- Real-time quote management

## Setup

### Prerequisites

- Node.js 16+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/toolsmlai-web/printlagbe.git
   cd printlagbe
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Add your Supabase credentials to `.env`:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

### Development

```bash
npm run dev
```

The app will open at `http://localhost:5173`

### Database Setup

1. In your Supabase project, go to SQL Editor
2. Run the migration from `supabase/migrations/001_initial.sql`
3. Enable **Email** auth under Authentication → Providers
4. Add `http://localhost:5173` to allowed redirect URLs in Authentication → URL Configuration

### Build

```bash
npm run build
```

## Project Structure

```
printlagbe/
├── src/
│   ├── main.tsx          # Entry point
│   ├── App.tsx           # Main app component
│   ├── styles.css        # Global styles
│   ├── vite-env.d.ts     # Vite type definitions
│   └── lib/
│       └── supabase.ts   # Supabase client
├── supabase/
│   └── migrations/       # Database migrations
├── index.html            # HTML template
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
└── vite.config.ts        # Vite config
```

## Security Notes

- Never commit `.env` files
- Review Row Level Security (RLS) policies before production
- The `create_quote_request` RPC is granted to `authenticated` users

## License

Private repository
