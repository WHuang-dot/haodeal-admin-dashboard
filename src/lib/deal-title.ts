type DealTitleFields = {
  title_cn?: string | null;
  title_en?: string | null;
};

export function getDealDisplayTitle(
  deal: DealTitleFields,
  fallback = "Untitled Deal"
) {
  return deal.title_cn || deal.title_en || fallback;
}
