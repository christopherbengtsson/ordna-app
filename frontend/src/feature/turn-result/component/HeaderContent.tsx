interface Props {
  icon: React.ReactNode;
  title: string;
}

export function HeaderContent({ icon, title }: Props) {
  return (
    <div className="flex flex-col items-center gap-3">
      {icon}
      <span className="text-xl font-semibold">{title}</span>
    </div>
  );
}
