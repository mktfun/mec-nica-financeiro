-- Criar a RPC para liquidar (dar baixa) nas OSs legadas do Marco Zero em lote
CREATE OR REPLACE FUNCTION liquidate_legacy_os(p_os_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_count integer;
BEGIN
    IF p_os_ids IS NULL OR array_length(p_os_ids, 1) IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Nenhum ID fornecido.');
    END IF;

    -- Atualiza as OSs que estão em aberto para pago e iguala o paid_value ao total_value
    UPDATE patio_os
    SET 
        status = 'pago',
        paid_value = total_value,
        updated_at = now()
    WHERE id = ANY(p_os_ids)
      AND status = 'em_aberto';

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'status', 'success', 
        'message', v_updated_count || ' OS(s) liquidadas com sucesso.',
        'updated_count', v_updated_count
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'status', 'error', 
            'message', 'Erro ao liquidar OSs: ' || SQLERRM
        );
END;
$$;
