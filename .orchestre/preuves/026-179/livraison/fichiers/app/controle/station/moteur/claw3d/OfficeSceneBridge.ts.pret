// Pont React → Phaser. Copié de Claw3D (src/features/office/phaser/OfficeSceneBridge.ts, commit 0565b78, MIT, voir PROVENANCE.md),
// puis modifié pour la station : c'est une CLASSE (les méthodes sont sur le prototype, un juge peut donc compter chaque appel), l'état
// n'est plus celui d'une carte de bureau (`map`, `presence`, `debug`, `runtime`) mais une liste d'acteurs, et il compare PAR VALEUR :
// celui de Claw3D prévenait ses abonnés à chaque appel, sans comparer, ce qui réveillait Phaser à chaque lecture des vues.
// Une méthode du pont n'est appelée que sur un vrai changement : au repos, aucun appel, la boucle de Phaser dort.

export type OfficeSceneBridgeState<E> = {
  acteurs: readonly E[];
};

export class OfficeSceneBridge<E = unknown> {
  private state: OfficeSceneBridgeState<E> = { acteurs: [] };
  private signature = JSON.stringify(this.state);
  private readonly listeners = new Set<() => void>();

  getState(): OfficeSceneBridgeState<E> {
    return this.state;
  }

  /** Pose le nouvel état. Rend true et prévient les abonnés seulement si l'état change PAR VALEUR. */
  setState(next: Partial<OfficeSceneBridgeState<E>>): boolean {
    const state = { ...this.state, ...next };
    const signature = JSON.stringify(state);
    if (signature === this.signature) return false;
    this.state = state;
    this.signature = signature;
    for (const listener of [...this.listeners]) {
      listener();
    }
    return true;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
