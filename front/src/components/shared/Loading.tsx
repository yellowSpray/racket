import { Spinner } from "@/components/ui/spinner";

const Loading = () => {
  return (
    <section className="w-full h-lvh flex flex-col items-center justify-center">
        <Spinner />
    </section>
  );
};

export default Loading;