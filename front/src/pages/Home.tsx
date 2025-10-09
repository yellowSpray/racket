export default function Home() {
    return (
        <section className="flex items-center justify-center">
            <div className="text-center space-y-6">
                <h1 className="text-4xl font-bold text-primary">Bienvenue sur RacketFest</h1>
                <p className="text-lg text-muted-foreground">
                    Découvrez l'événement ultime pour les passionnés de raquette !
                </p>
                <button className="btn btn-primary">En savoir plus</button>
            </div>
        </section>
    )
}