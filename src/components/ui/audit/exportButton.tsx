interface Props {
  onExportCSV: () => void;
}

export default function ExportButtons({ onExportCSV }: Props) {
  return (
    <button onClick={onExportCSV}>
      Export CSV
    </button>
  );
}
