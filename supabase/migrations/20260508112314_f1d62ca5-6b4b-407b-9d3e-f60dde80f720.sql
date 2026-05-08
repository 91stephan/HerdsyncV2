-- 1) Atomic relative quantity adjustment (positive = restock, negative = usage)
CREATE OR REPLACE FUNCTION public.adjust_inventory_quantity(
  _inventory_id uuid,
  _delta numeric
)
RETURNS TABLE (id uuid, farm_id uuid, quantity numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _farm uuid;
  _new_qty numeric;
BEGIN
  SELECT inv.farm_id, inv.quantity + _delta
    INTO _farm, _new_qty
  FROM public.inventory inv
  WHERE inv.id = _inventory_id
  FOR UPDATE;

  IF _farm IS NULL THEN
    RAISE EXCEPTION 'Inventory item not found';
  END IF;

  IF NOT public.is_farm_member(auth.uid(), _farm) THEN
    RAISE EXCEPTION 'Not authorized for this farm';
  END IF;

  IF _new_qty < 0 THEN
    RAISE EXCEPTION 'Insufficient stock: would go below zero';
  END IF;

  UPDATE public.inventory
  SET quantity = _new_qty,
      updated_at = now()
  WHERE inventory.id = _inventory_id;

  RETURN QUERY SELECT _inventory_id, _farm, _new_qty;
END;
$$;

-- 2) Atomic restock that also bumps cost / supplier / last_restocked
CREATE OR REPLACE FUNCTION public.restock_inventory_item(
  _inventory_id uuid,
  _quantity_to_add numeric,
  _cost_per_unit numeric,
  _supplier text DEFAULT NULL
)
RETURNS TABLE (id uuid, farm_id uuid, quantity numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _farm uuid;
  _new_qty numeric;
BEGIN
  IF _quantity_to_add <= 0 THEN
    RAISE EXCEPTION 'Restock quantity must be positive';
  END IF;

  SELECT inv.farm_id, inv.quantity + _quantity_to_add
    INTO _farm, _new_qty
  FROM public.inventory inv
  WHERE inv.id = _inventory_id
  FOR UPDATE;

  IF _farm IS NULL THEN
    RAISE EXCEPTION 'Inventory item not found';
  END IF;

  IF NOT public.is_farm_member(auth.uid(), _farm) THEN
    RAISE EXCEPTION 'Not authorized for this farm';
  END IF;

  UPDATE public.inventory
  SET quantity = _new_qty,
      cost_per_unit = _cost_per_unit,
      last_restocked = CURRENT_DATE,
      supplier = COALESCE(_supplier, inventory.supplier),
      updated_at = now()
  WHERE inventory.id = _inventory_id;

  RETURN QUERY SELECT _inventory_id, _farm, _new_qty;
END;
$$;

-- 3) Realtime for inventory_usage_log
ALTER TABLE public.inventory_usage_log REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_usage_log;