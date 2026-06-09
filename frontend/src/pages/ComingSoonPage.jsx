// Coming Soon placeholder page
import { SvgIcon, EmptyState, Btn } from "../shared/components";

function ComingSoonPage({ title }) {
  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
      </div>
      <div className="card" style={{ maxWidth: 480, margin: "0 auto" }}>
        <EmptyState
          icon={<SvgIcon name="alert" size={28} color="var(--muted)" />}
          title="Coming in the next part"
          desc={`The ${title} module is being built. The data structures and routing are all ready.`}
          action={<Btn variant="outline">Learn More</Btn>}
        />
      </div>
    </div>
  );
}


export default ComingSoonPage;
