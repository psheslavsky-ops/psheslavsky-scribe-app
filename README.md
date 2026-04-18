# Scribe_ — Локальный запуск

## Требования
- Node.js 18+ (или Bun)
- Supabase-проект (для авторизации и хранения транскриптов)

## Установка

```bash
# 1. Установить зависимости
npm install

# 2. Создать .env из шаблона
cp .env.example .env

# 3. Заполнить .env — вставить реальные ключи Supabase:
#    VITE_SUPABASE_URL      → Project Settings → API → Project URL
#    VITE_SUPABASE_PUBLISHABLE_KEY → Project Settings → API → anon/public key

# 4. Запустить
npm run dev
# Откроется на http://localhost:8080
```

## Supabase — что нужно настроить

1. **Таблицы** — выполнить миграции из папки `supabase/migrations/`:
   - `20260314_transcripts.sql` — таблица транскрипций
   - `20260315_feedback.sql` — таблица отзывов

2. **Edge Functions** — задеплоить из папки `supabase/functions/`:
   - `transcribe` — использует Groq Whisper API (нужен `GROQ_API_KEY` в секретах)
   - `meeting-protocol`, `business-requirements`, `vision-scope`,
     `meeting-summary`, `user-stories`, `use-cases`, `flowchart`
     — используют `LOVABLE_API_KEY` (любой OpenAI-совместимый ключ)

3. **Google OAuth** — включить в Supabase → Authentication → Providers → Google

## Без Supabase (только UI)

Можно запустить без Supabase для просмотра интерфейса:
- Создать пустой `.env` с фиктивными значениями
- Авторизация не будет работать, но UI загрузится
