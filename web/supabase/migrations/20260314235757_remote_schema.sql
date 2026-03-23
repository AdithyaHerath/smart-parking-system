


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'student',
    'super_admin',
    'security',
    'cashier'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."booking_status" AS ENUM (
    'pending',
    'confirmed',
    'arrived',
    'completed',
    'cancelled',
    'expired'
);


ALTER TYPE "public"."booking_status" OWNER TO "postgres";


CREATE TYPE "public"."complaint_status" AS ENUM (
    'pending',
    'accepted',
    'declined'
);


ALTER TYPE "public"."complaint_status" OWNER TO "postgres";


CREATE TYPE "public"."slot_status" AS ENUM (
    'free',
    'booked',
    'arrived'
);


ALTER TYPE "public"."slot_status" OWNER TO "postgres";


CREATE TYPE "public"."slot_type" AS ENUM (
    'car',
    'motorbike'
);


ALTER TYPE "public"."slot_type" OWNER TO "postgres";


CREATE TYPE "public"."transaction_type" AS ENUM (
    'topup',
    'parking_fee',
    'penalty',
    'walkin_surcharge',
    'refund'
);


ALTER TYPE "public"."transaction_type" OWNER TO "postgres";


CREATE TYPE "public"."vehicle_type" AS ENUM (
    'car',
    'motorbike'
);


ALTER TYPE "public"."vehicle_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_vehicle_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF (SELECT COUNT(*) FROM public.vehicles WHERE user_id = NEW.user_id) >= 5 THEN
        RAISE EXCEPTION 'Maximum 5 vehicles allowed per user';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_vehicle_limit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_cancellation_window"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN
    IF (OLD.booking_time - now()) < interval '1 hour' THEN
      RAISE EXCEPTION 'Cancellation not allowed less than 1 hour before booking time';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_cancellation_window"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_penalty_report"() RETURNS TABLE("penalty_id" "uuid", "user_name" "text", "student_id" "text", "plate_number" "text", "offense_number" integer, "amount_lkr" integer, "current_balance" integer, "violation_count" bigint, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN RAISE EXCEPTION 'Forbidden'; END IF;
    RETURN QUERY
    SELECT pen.id AS penalty_id, p.name AS user_name, p.student_id,
        COALESCE((SELECT v.plate_number FROM public.vehicles v WHERE v.user_id = pen.user_id LIMIT 1), 'N/A') AS plate_number,
        pen.offense_number, pen.amount_lkr, COALESCE(w.balance_lkr, 0) AS current_balance,
        (SELECT COUNT(*) FROM public.penalties p2 WHERE p2.user_id = pen.user_id) AS violation_count, pen.created_at
    FROM public.penalties pen JOIN public.profiles p ON p.id = pen.user_id LEFT JOIN public.wallets w ON w.user_id = pen.user_id
    ORDER BY pen.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_admin_penalty_report"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_revenue_report"("_date" "date") RETURNS TABLE("transaction_id" "uuid", "user_name" "text", "student_id" "text", "amount_lkr" integer, "type" "text", "description" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
  SELECT t.id AS transaction_id, p.name AS user_name, p.student_id, t.amount_lkr, t.type::text, t.description, t.created_at
  FROM public.transactions t JOIN public.profiles p ON p.id = t.user_id
  WHERE t.type IN ('parking_fee', 'penalty', 'walkin_surcharge') AND t.created_at::date = _date
  ORDER BY t.created_at ASC;
END;
$$;


ALTER FUNCTION "public"."get_admin_revenue_report"("_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cashier_topup_report"("_date" "date") RETURNS TABLE("user_name" "text", "student_id" "text", "amount_lkr" bigint, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'cashier'::app_role) AND NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY SELECT p.name AS user_name, p.student_id, t.amount_lkr::bigint, t.created_at
  FROM public.transactions t JOIN public.profiles p ON p.id = t.user_id
  WHERE t.type = 'topup' AND t.created_at::date = _date ORDER BY t.created_at ASC;
END;
$$;


ALTER FUNCTION "public"."get_cashier_topup_report"("_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cashier_topup_stats"("_since" timestamp with time zone) RETURNS TABLE("today_topups" bigint, "total_amount" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'cashier'::app_role) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY SELECT COUNT(*)::bigint AS today_topups, COALESCE(SUM(t.amount_lkr), 0)::bigint AS total_amount
  FROM public.transactions t WHERE t.type = 'topup' AND t.created_at >= _since;
END;
$$;


ALTER FUNCTION "public"."get_cashier_topup_stats"("_since" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_email_by_student_id"("_student_id" "text") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT email FROM public.profiles WHERE student_id = _student_id LIMIT 1;
$$;


ALTER FUNCTION "public"."get_email_by_student_id"("_student_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    INSERT INTO public.profiles (id, student_id, name, phone, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'student_id', ''),
        COALESCE(NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        NEW.email
    );
    INSERT INTO public.wallets (user_id, balance_lkr) VALUES (NEW.id, 0);
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lock_slot_on_booking_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE _updated_rows integer;
BEGIN
  IF NEW.status IN ('confirmed', 'arrived') THEN
    UPDATE public.parking_slots
    SET status = CASE WHEN NEW.status = 'arrived' THEN 'arrived'::slot_status ELSE 'booked'::slot_status END
    WHERE id = NEW.slot_id AND status = 'free'::slot_status;

    GET DIAGNOSTICS _updated_rows = ROW_COUNT;
    IF _updated_rows = 0 THEN RAISE EXCEPTION 'Slot unavailable'; END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."lock_slot_on_booking_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_penalty"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    violator_id UUID;
    offense_count INTEGER;
    penalty_amount INTEGER;
    existing_penalty UUID;
BEGIN
    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        IF NEW.violation_type = 'park_on_my_spot' THEN
            SELECT id INTO existing_penalty FROM public.penalties WHERE complaint_id = NEW.id;
            IF existing_penalty IS NOT NULL THEN RETURN NEW; END IF;

            SELECT v.user_id INTO violator_id FROM public.vehicles v WHERE v.plate_number = NEW.violation_plate;
            IF violator_id IS NULL THEN RETURN NEW; END IF;

            SELECT COUNT(*) + 1 INTO offense_count FROM public.penalties p WHERE p.user_id = violator_id;

            IF offense_count = 1 THEN penalty_amount := 200;
            ELSIF offense_count = 2 THEN penalty_amount := 400;
            ELSE
                UPDATE public.profiles SET status = 'suspended' WHERE id = violator_id;
                penalty_amount := 0;
            END IF;

            IF penalty_amount > 0 THEN
                UPDATE public.wallets SET balance_lkr = balance_lkr - penalty_amount WHERE user_id = violator_id;
                INSERT INTO public.transactions (user_id, amount_lkr, type, description)
                VALUES (violator_id, -penalty_amount, 'penalty', 'Offense #' || offense_count);
            END IF;

            INSERT INTO public.penalties (user_id, complaint_id, offense_number, amount_lkr)
            VALUES (violator_id, NEW.id, offense_count, penalty_amount);
        END IF;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."process_penalty"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_slot_on_booking_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  IF NEW.status IN ('cancelled', 'completed', 'expired') THEN
    UPDATE public.parking_slots SET status = 'free'::slot_status WHERE id = NEW.slot_id;
  ELSIF NEW.status = 'arrived' THEN
    UPDATE public.parking_slots SET status = 'arrived'::slot_status WHERE id = NEW.slot_id;
  ELSIF NEW.status = 'confirmed' THEN
    UPDATE public.parking_slots SET status = 'booked'::slot_status WHERE id = NEW.slot_id AND status = 'free'::slot_status;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_slot_on_booking_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "slot_id" "uuid" NOT NULL,
    "vehicle_id" "uuid",
    "booking_time" timestamp with time zone NOT NULL,
    "status" "public"."booking_status" DEFAULT 'confirmed'::"public"."booking_status" NOT NULL,
    "is_walkin" boolean DEFAULT false NOT NULL,
    "fee_lkr" integer NOT NULL,
    "fee_deducted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."complaint_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "complaint_id" "uuid" NOT NULL,
    "acted_by" "uuid" NOT NULL,
    "action" "public"."complaint_status" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."complaint_actions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."complaints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "violation_plate" "text" NOT NULL,
    "description" "text" NOT NULL,
    "status" "public"."complaint_status" DEFAULT 'pending'::"public"."complaint_status" NOT NULL,
    "violation_type" "text" DEFAULT 'other'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."complaints" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."otp_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "code" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."otp_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."parking_slots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slot_code" "text" NOT NULL,
    "type" "public"."slot_type" NOT NULL,
    "status" "public"."slot_status" DEFAULT 'free'::"public"."slot_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."parking_slots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."penalties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "complaint_id" "uuid" NOT NULL,
    "offense_number" integer NOT NULL,
    "amount_lkr" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."penalties" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "student_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "email" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "booking_id" "uuid",
    "amount_lkr" integer NOT NULL,
    "type" "public"."transaction_type" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vehicles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plate_number" "text" NOT NULL,
    "type" "public"."vehicle_type" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."vehicles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wallets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "balance_lkr" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."wallets" OWNER TO "postgres";


ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."complaint_actions"
    ADD CONSTRAINT "complaint_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."complaints"
    ADD CONSTRAINT "complaints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."otp_codes"
    ADD CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."parking_slots"
    ADD CONSTRAINT "parking_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."parking_slots"
    ADD CONSTRAINT "parking_slots_slot_code_key" UNIQUE ("slot_code");



ALTER TABLE ONLY "public"."penalties"
    ADD CONSTRAINT "penalties_complaint_id_unique" UNIQUE ("complaint_id");



ALTER TABLE ONLY "public"."penalties"
    ADD CONSTRAINT "penalties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_student_id_key" UNIQUE ("student_id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_plate_number_key" UNIQUE ("plate_number");



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_user_id_key" UNIQUE ("user_id");



CREATE OR REPLACE TRIGGER "bookings_lock_slot_on_insert" BEFORE INSERT ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."lock_slot_on_booking_insert"();



CREATE OR REPLACE TRIGGER "bookings_sync_slot_after_status_update" AFTER UPDATE OF "status" ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."sync_slot_on_booking_status_change"();



CREATE OR REPLACE TRIGGER "check_vehicle_limit_trigger" BEFORE INSERT ON "public"."vehicles" FOR EACH ROW EXECUTE FUNCTION "public"."check_vehicle_limit"();



CREATE OR REPLACE TRIGGER "complaints_process_penalty" AFTER UPDATE OF "status" ON "public"."complaints" FOR EACH ROW EXECUTE FUNCTION "public"."process_penalty"();



CREATE OR REPLACE TRIGGER "set_complaints_updated_at" BEFORE UPDATE ON "public"."complaints" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_enforce_cancellation_window" BEFORE UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_cancellation_window"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "public"."parking_slots"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."complaint_actions"
    ADD CONSTRAINT "complaint_actions_acted_by_fkey" FOREIGN KEY ("acted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."complaint_actions"
    ADD CONSTRAINT "complaint_actions_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaints"("id");



ALTER TABLE ONLY "public"."complaints"
    ADD CONSTRAINT "complaints_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id");



ALTER TABLE ONLY "public"."complaints"
    ADD CONSTRAINT "complaints_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."penalties"
    ADD CONSTRAINT "penalties_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaints"("id");



ALTER TABLE ONLY "public"."penalties"
    ADD CONSTRAINT "penalties_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admin can delete slots" ON "public"."parking_slots" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "Admin can insert slots" ON "public"."parking_slots" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "Admin can manage complaint actions" ON "public"."complaint_actions" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "Admin can manage roles" ON "public"."user_roles" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "Admin can update all profiles" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "Admin can update bookings" ON "public"."bookings" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "Admin can update complaints" ON "public"."complaints" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "Admin can update slots" ON "public"."parking_slots" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "Admin can view all bookings" ON "public"."bookings" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "Admin can view all complaints" ON "public"."complaints" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "Admin can view all penalties" ON "public"."penalties" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "Admin can view all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "Admin can view all transactions" ON "public"."transactions" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "Admin can view all vehicles" ON "public"."vehicles" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "Admin can view all wallets" ON "public"."wallets" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "Anyone authenticated can view slots" ON "public"."parking_slots" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Cashier can insert transactions" ON "public"."transactions" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'cashier'::"public"."app_role"));



CREATE POLICY "Cashier can update wallets" ON "public"."wallets" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'cashier'::"public"."app_role"));



CREATE POLICY "Cashier can view all wallets" ON "public"."wallets" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'cashier'::"public"."app_role"));



CREATE POLICY "Cashier can view profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'cashier'::"public"."app_role"));



CREATE POLICY "Security can delete emergency slots" ON "public"."parking_slots" FOR DELETE TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'security'::"public"."app_role") AND ("slot_code" ~~ 'TEMP-%'::"text")));



CREATE POLICY "Security can insert bookings" ON "public"."bookings" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'security'::"public"."app_role"));



CREATE POLICY "Security can insert emergency slots" ON "public"."parking_slots" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'security'::"public"."app_role"));



CREATE POLICY "Security can insert transactions" ON "public"."transactions" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'security'::"public"."app_role"));



CREATE POLICY "Security can manage complaint actions" ON "public"."complaint_actions" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'security'::"public"."app_role"));



CREATE POLICY "Security can update bookings" ON "public"."bookings" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'security'::"public"."app_role"));



CREATE POLICY "Security can update complaints" ON "public"."complaints" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'security'::"public"."app_role"));



CREATE POLICY "Security can update slots" ON "public"."parking_slots" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'security'::"public"."app_role"));



CREATE POLICY "Security can update wallets" ON "public"."wallets" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'security'::"public"."app_role"));



CREATE POLICY "Security can view all bookings" ON "public"."bookings" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'security'::"public"."app_role"));



CREATE POLICY "Security can view all complaints" ON "public"."complaints" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'security'::"public"."app_role"));



CREATE POLICY "Security can view all vehicles" ON "public"."vehicles" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'security'::"public"."app_role"));



CREATE POLICY "Security can view profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'security'::"public"."app_role"));



CREATE POLICY "Security can view wallets" ON "public"."wallets" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'security'::"public"."app_role"));



CREATE POLICY "Users can create complaints" ON "public"."complaints" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users can create own bookings" ON "public"."bookings" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own vehicles" ON "public"."vehicles" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert own transactions" ON "public"."transactions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own vehicles" ON "public"."vehicles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own wallet" ON "public"."wallets" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own bookings" ON "public"."bookings" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own vehicles" ON "public"."vehicles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view actions on own complaints" ON "public"."complaint_actions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."complaints" "c"
  WHERE (("c"."id" = "complaint_actions"."complaint_id") AND ("c"."reporter_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own bookings" ON "public"."bookings" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own complaints" ON "public"."complaints" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users can view own penalties" ON "public"."penalties" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own transactions" ON "public"."transactions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own vehicles" ON "public"."vehicles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own wallet" ON "public"."wallets" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."complaint_actions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."complaints" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."otp_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."parking_slots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."penalties" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vehicles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wallets" ENABLE ROW LEVEL SECURITY;












GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."check_vehicle_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_vehicle_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_vehicle_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_cancellation_window"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_cancellation_window"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_cancellation_window"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_admin_penalty_report"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_admin_penalty_report"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_penalty_report"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_penalty_report"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_admin_revenue_report"("_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_admin_revenue_report"("_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_revenue_report"("_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_revenue_report"("_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_cashier_topup_report"("_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_cashier_topup_report"("_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cashier_topup_report"("_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cashier_topup_report"("_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_cashier_topup_stats"("_since" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_cashier_topup_stats"("_since" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_cashier_topup_stats"("_since" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cashier_topup_stats"("_since" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_email_by_student_id"("_student_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_email_by_student_id"("_student_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_email_by_student_id"("_student_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."lock_slot_on_booking_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."lock_slot_on_booking_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."lock_slot_on_booking_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_penalty"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_penalty"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_penalty"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_slot_on_booking_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_slot_on_booking_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_slot_on_booking_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";
























GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."complaint_actions" TO "anon";
GRANT ALL ON TABLE "public"."complaint_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."complaint_actions" TO "service_role";



GRANT ALL ON TABLE "public"."complaints" TO "anon";
GRANT ALL ON TABLE "public"."complaints" TO "authenticated";
GRANT ALL ON TABLE "public"."complaints" TO "service_role";



GRANT ALL ON TABLE "public"."otp_codes" TO "anon";
GRANT ALL ON TABLE "public"."otp_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."otp_codes" TO "service_role";



GRANT ALL ON TABLE "public"."parking_slots" TO "anon";
GRANT ALL ON TABLE "public"."parking_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."parking_slots" TO "service_role";



GRANT ALL ON TABLE "public"."penalties" TO "anon";
GRANT ALL ON TABLE "public"."penalties" TO "authenticated";
GRANT ALL ON TABLE "public"."penalties" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."vehicles" TO "anon";
GRANT ALL ON TABLE "public"."vehicles" TO "authenticated";
GRANT ALL ON TABLE "public"."vehicles" TO "service_role";



GRANT ALL ON TABLE "public"."wallets" TO "anon";
GRANT ALL ON TABLE "public"."wallets" TO "authenticated";
GRANT ALL ON TABLE "public"."wallets" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop trigger if exists "bookings_lock_slot_on_insert" on "public"."bookings";

drop trigger if exists "bookings_sync_slot_after_status_update" on "public"."bookings";

drop trigger if exists "trg_enforce_cancellation_window" on "public"."bookings";

drop trigger if exists "complaints_process_penalty" on "public"."complaints";

drop trigger if exists "set_complaints_updated_at" on "public"."complaints";

drop trigger if exists "update_profiles_updated_at" on "public"."profiles";

drop trigger if exists "check_vehicle_limit_trigger" on "public"."vehicles";

drop policy "Admin can update bookings" on "public"."bookings";

drop policy "Admin can view all bookings" on "public"."bookings";

drop policy "Security can insert bookings" on "public"."bookings";

drop policy "Security can update bookings" on "public"."bookings";

drop policy "Security can view all bookings" on "public"."bookings";

drop policy "Admin can manage complaint actions" on "public"."complaint_actions";

drop policy "Security can manage complaint actions" on "public"."complaint_actions";

drop policy "Users can view actions on own complaints" on "public"."complaint_actions";

drop policy "Admin can update complaints" on "public"."complaints";

drop policy "Admin can view all complaints" on "public"."complaints";

drop policy "Security can update complaints" on "public"."complaints";

drop policy "Security can view all complaints" on "public"."complaints";

drop policy "Admin can delete slots" on "public"."parking_slots";

drop policy "Admin can insert slots" on "public"."parking_slots";

drop policy "Admin can update slots" on "public"."parking_slots";

drop policy "Security can delete emergency slots" on "public"."parking_slots";

drop policy "Security can insert emergency slots" on "public"."parking_slots";

drop policy "Security can update slots" on "public"."parking_slots";

drop policy "Admin can view all penalties" on "public"."penalties";

drop policy "Admin can update all profiles" on "public"."profiles";

drop policy "Admin can view all profiles" on "public"."profiles";

drop policy "Cashier can view profiles" on "public"."profiles";

drop policy "Security can view profiles" on "public"."profiles";

drop policy "Admin can view all transactions" on "public"."transactions";

drop policy "Cashier can insert transactions" on "public"."transactions";

drop policy "Security can insert transactions" on "public"."transactions";

drop policy "Admin can manage roles" on "public"."user_roles";

drop policy "Admin can view all vehicles" on "public"."vehicles";

drop policy "Security can view all vehicles" on "public"."vehicles";

drop policy "Admin can view all wallets" on "public"."wallets";

drop policy "Cashier can update wallets" on "public"."wallets";

drop policy "Cashier can view all wallets" on "public"."wallets";

drop policy "Security can update wallets" on "public"."wallets";

drop policy "Security can view wallets" on "public"."wallets";

alter table "public"."bookings" drop constraint "bookings_slot_id_fkey";

alter table "public"."bookings" drop constraint "bookings_vehicle_id_fkey";

alter table "public"."complaint_actions" drop constraint "complaint_actions_complaint_id_fkey";

alter table "public"."complaints" drop constraint "complaints_booking_id_fkey";

alter table "public"."penalties" drop constraint "penalties_complaint_id_fkey";

alter table "public"."transactions" drop constraint "transactions_booking_id_fkey";

drop function if exists "public"."has_role"(_user_id uuid, _role app_role);

alter table "public"."bookings" alter column "status" set default 'confirmed'::public.booking_status;

alter table "public"."bookings" alter column "status" set data type public.booking_status using "status"::text::public.booking_status;

alter table "public"."complaint_actions" alter column "action" set data type public.complaint_status using "action"::text::public.complaint_status;

alter table "public"."complaints" alter column "status" set default 'pending'::public.complaint_status;

alter table "public"."complaints" alter column "status" set data type public.complaint_status using "status"::text::public.complaint_status;

alter table "public"."parking_slots" alter column "status" set default 'free'::public.slot_status;

alter table "public"."parking_slots" alter column "status" set data type public.slot_status using "status"::text::public.slot_status;

alter table "public"."parking_slots" alter column "type" set data type public.slot_type using "type"::text::public.slot_type;

alter table "public"."transactions" alter column "type" set data type public.transaction_type using "type"::text::public.transaction_type;

alter table "public"."user_roles" alter column "role" set data type public.app_role using "role"::text::public.app_role;

alter table "public"."vehicles" alter column "type" set data type public.vehicle_type using "type"::text::public.vehicle_type;

alter table "public"."bookings" add constraint "bookings_slot_id_fkey" FOREIGN KEY (slot_id) REFERENCES public.parking_slots(id) not valid;

alter table "public"."bookings" validate constraint "bookings_slot_id_fkey";

alter table "public"."bookings" add constraint "bookings_vehicle_id_fkey" FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE not valid;

alter table "public"."bookings" validate constraint "bookings_vehicle_id_fkey";

alter table "public"."complaint_actions" add constraint "complaint_actions_complaint_id_fkey" FOREIGN KEY (complaint_id) REFERENCES public.complaints(id) not valid;

alter table "public"."complaint_actions" validate constraint "complaint_actions_complaint_id_fkey";

alter table "public"."complaints" add constraint "complaints_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES public.bookings(id) not valid;

alter table "public"."complaints" validate constraint "complaints_booking_id_fkey";

alter table "public"."penalties" add constraint "penalties_complaint_id_fkey" FOREIGN KEY (complaint_id) REFERENCES public.complaints(id) not valid;

alter table "public"."penalties" validate constraint "penalties_complaint_id_fkey";

alter table "public"."transactions" add constraint "transactions_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES public.bookings(id) not valid;

alter table "public"."transactions" validate constraint "transactions_booking_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$function$
;


  create policy "Admin can update bookings"
  on "public"."bookings"
  as permissive
  for update
  to authenticated
using (public.has_role(auth.uid(), 'super_admin'::public.app_role));



  create policy "Admin can view all bookings"
  on "public"."bookings"
  as permissive
  for select
  to authenticated
using (public.has_role(auth.uid(), 'super_admin'::public.app_role));



  create policy "Security can insert bookings"
  on "public"."bookings"
  as permissive
  for insert
  to authenticated
with check (public.has_role(auth.uid(), 'security'::public.app_role));



  create policy "Security can update bookings"
  on "public"."bookings"
  as permissive
  for update
  to authenticated
using (public.has_role(auth.uid(), 'security'::public.app_role));



  create policy "Security can view all bookings"
  on "public"."bookings"
  as permissive
  for select
  to authenticated
using (public.has_role(auth.uid(), 'security'::public.app_role));



  create policy "Admin can manage complaint actions"
  on "public"."complaint_actions"
  as permissive
  for all
  to authenticated
using (public.has_role(auth.uid(), 'super_admin'::public.app_role));



  create policy "Security can manage complaint actions"
  on "public"."complaint_actions"
  as permissive
  for all
  to authenticated
using (public.has_role(auth.uid(), 'security'::public.app_role));



  create policy "Users can view actions on own complaints"
  on "public"."complaint_actions"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.complaints c
  WHERE ((c.id = complaint_actions.complaint_id) AND (c.reporter_id = auth.uid())))));



  create policy "Admin can update complaints"
  on "public"."complaints"
  as permissive
  for update
  to authenticated
using (public.has_role(auth.uid(), 'super_admin'::public.app_role));



  create policy "Admin can view all complaints"
  on "public"."complaints"
  as permissive
  for select
  to authenticated
using (public.has_role(auth.uid(), 'super_admin'::public.app_role));



  create policy "Security can update complaints"
  on "public"."complaints"
  as permissive
  for update
  to authenticated
using (public.has_role(auth.uid(), 'security'::public.app_role));



  create policy "Security can view all complaints"
  on "public"."complaints"
  as permissive
  for select
  to authenticated
using (public.has_role(auth.uid(), 'security'::public.app_role));



  create policy "Admin can delete slots"
  on "public"."parking_slots"
  as permissive
  for delete
  to authenticated
using (public.has_role(auth.uid(), 'super_admin'::public.app_role));



  create policy "Admin can insert slots"
  on "public"."parking_slots"
  as permissive
  for insert
  to authenticated
with check (public.has_role(auth.uid(), 'super_admin'::public.app_role));



  create policy "Admin can update slots"
  on "public"."parking_slots"
  as permissive
  for update
  to authenticated
using (public.has_role(auth.uid(), 'super_admin'::public.app_role));



  create policy "Security can delete emergency slots"
  on "public"."parking_slots"
  as permissive
  for delete
  to authenticated
using ((public.has_role(auth.uid(), 'security'::public.app_role) AND (slot_code ~~ 'TEMP-%'::text)));



  create policy "Security can insert emergency slots"
  on "public"."parking_slots"
  as permissive
  for insert
  to authenticated
with check (public.has_role(auth.uid(), 'security'::public.app_role));



  create policy "Security can update slots"
  on "public"."parking_slots"
  as permissive
  for update
  to authenticated
using (public.has_role(auth.uid(), 'security'::public.app_role));



  create policy "Admin can view all penalties"
  on "public"."penalties"
  as permissive
  for select
  to authenticated
using (public.has_role(auth.uid(), 'super_admin'::public.app_role));



  create policy "Admin can update all profiles"
  on "public"."profiles"
  as permissive
  for update
  to authenticated
using (public.has_role(auth.uid(), 'super_admin'::public.app_role));



  create policy "Admin can view all profiles"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using (public.has_role(auth.uid(), 'super_admin'::public.app_role));



  create policy "Cashier can view profiles"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using (public.has_role(auth.uid(), 'cashier'::public.app_role));



  create policy "Security can view profiles"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using (public.has_role(auth.uid(), 'security'::public.app_role));



  create policy "Admin can view all transactions"
  on "public"."transactions"
  as permissive
  for select
  to authenticated
using (public.has_role(auth.uid(), 'super_admin'::public.app_role));



  create policy "Cashier can insert transactions"
  on "public"."transactions"
  as permissive
  for insert
  to authenticated
with check (public.has_role(auth.uid(), 'cashier'::public.app_role));



  create policy "Security can insert transactions"
  on "public"."transactions"
  as permissive
  for insert
  to authenticated
with check (public.has_role(auth.uid(), 'security'::public.app_role));



  create policy "Admin can manage roles"
  on "public"."user_roles"
  as permissive
  for all
  to authenticated
using (public.has_role(auth.uid(), 'super_admin'::public.app_role));



  create policy "Admin can view all vehicles"
  on "public"."vehicles"
  as permissive
  for select
  to authenticated
using (public.has_role(auth.uid(), 'super_admin'::public.app_role));



  create policy "Security can view all vehicles"
  on "public"."vehicles"
  as permissive
  for select
  to authenticated
using (public.has_role(auth.uid(), 'security'::public.app_role));



  create policy "Admin can view all wallets"
  on "public"."wallets"
  as permissive
  for select
  to authenticated
using (public.has_role(auth.uid(), 'super_admin'::public.app_role));



  create policy "Cashier can update wallets"
  on "public"."wallets"
  as permissive
  for update
  to authenticated
using (public.has_role(auth.uid(), 'cashier'::public.app_role));



  create policy "Cashier can view all wallets"
  on "public"."wallets"
  as permissive
  for select
  to authenticated
using (public.has_role(auth.uid(), 'cashier'::public.app_role));



  create policy "Security can update wallets"
  on "public"."wallets"
  as permissive
  for update
  to authenticated
using (public.has_role(auth.uid(), 'security'::public.app_role));



  create policy "Security can view wallets"
  on "public"."wallets"
  as permissive
  for select
  to authenticated
using (public.has_role(auth.uid(), 'security'::public.app_role));


CREATE TRIGGER bookings_lock_slot_on_insert BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.lock_slot_on_booking_insert();

CREATE TRIGGER bookings_sync_slot_after_status_update AFTER UPDATE OF status ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.sync_slot_on_booking_status_change();

CREATE TRIGGER trg_enforce_cancellation_window BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.enforce_cancellation_window();

CREATE TRIGGER complaints_process_penalty AFTER UPDATE OF status ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.process_penalty();

CREATE TRIGGER set_complaints_updated_at BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER check_vehicle_limit_trigger BEFORE INSERT ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.check_vehicle_limit();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


