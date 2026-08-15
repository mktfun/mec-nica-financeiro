-- Migration: Create INSTEAD OF UPDATE Trigger on transactions View
-- Fixes PostgreSQL error 55000 (Views containing UNION are not automatically updatable)

CREATE OR REPLACE FUNCTION public.trg_transactions_instead_of_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Try updating ofx_transactions
    UPDATE public.ofx_transactions
    SET 
        manual_category = NEW.manual_category,
        manual_justification = NEW.manual_justification
    WHERE id = OLD.id;

    IF FOUND THEN
        RETURN NEW;
    END IF;

    -- 2. Try pos_transactions
    UPDATE public.pos_transactions
    SET 
        manual_category = NEW.manual_category,
        manual_justification = NEW.manual_justification
    WHERE id = OLD.id;

    IF FOUND THEN
        RETURN NEW;
    END IF;

    -- 3. Try manual_transactions
    UPDATE public.manual_transactions
    SET 
        manual_category = NEW.manual_category,
        manual_justification = NEW.manual_justification
    WHERE id = OLD.id;

    IF FOUND THEN
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transactions_update ON public.transactions;
CREATE TRIGGER trg_transactions_update
INSTEAD OF UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.trg_transactions_instead_of_update();
