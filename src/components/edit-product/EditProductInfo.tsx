interface Props { product: any }

export function EditProductInfo({ product }: Props) {
  return (
    <div className="space-y-3">
      {[
        { label: "SKU", value: product?.sku },
        { label: "Fornecedor", value: product?.fornecedor },
        { label: "Mundo", value: product?.mundo },
        { label: "ID", value: product?.id },
        { label: "Criado em", value: product?.created_at ? new Date(product.created_at).toLocaleString("pt-PT") : null },
        { label: "Actualizado em", value: product?.updated_at ? new Date(product.updated_at).toLocaleString("pt-PT") : null },
      ].map(({ label, value }) => (
        <div key={label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="text-sm font-medium font-mono">{value || "—"}</span>
        </div>
      ))}
    </div>
  );
}

export default EditProductInfo;
