// Crée la paire de clés qui protège les sauvegardes. À jouer UNE SEULE FOIS.
//
// Pourquoi une paire et pas un mot de passe : la machine qui sauvegarde (le serveur
// d'intégration continue, chaque nuit) ne doit pas pouvoir RELIRE ce qu'elle écrit. Avec une
// clé publique, elle chiffre sans pouvoir déchiffrer. La clé privée reste chez le propriétaire.
//
//   node scripts/cle-sauvegarde.mjs
//     → cle-sauvegarde.pub.pem   : publique, versionnée dans git, sans secret
//     → cle-sauvegarde.key.pem   : PRIVÉE, jamais versionnée (.gitignore), à mettre à l'abri
//
// Mets la clé privée dans ton gestionnaire de mots de passe ET sur une clé USB. Sans elle,
// les sauvegardes sont illisibles — c'est le but, et c'est aussi le risque : perdre cette clé,
// c'est perdre les sauvegardes.
import fs from 'node:fs'
import crypto from 'node:crypto'

const PUB = 'cle-sauvegarde.pub.pem'
const PRIV = 'cle-sauvegarde.key.pem'

if (fs.existsSync(PRIV) && !process.argv.includes('--remplacer')) {
  console.error(`❌ ${PRIV} existe déjà. Remplacer la clé rendrait ILLISIBLES toutes les sauvegardes existantes.\n   Si c'est vraiment voulu : node scripts/cle-sauvegarde.mjs --remplacer`)
  process.exit(2)
}

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 4096,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})
fs.writeFileSync(PUB, publicKey)
fs.writeFileSync(PRIV, privateKey)
console.log(`✅ ${PUB} — à versionner (aucun secret)`)
console.log(`✅ ${PRIV} — PRIVÉE : mets-la à l'abri maintenant, elle n'est pas versionnée et ne sera pas régénérable.`)
console.log('\nVérification immédiate : un aller-retour de chiffrement…')
const secret = crypto.randomBytes(32)
const scelle = crypto.publicEncrypt({ key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, secret)
const rendu = crypto.privateDecrypt({ key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, scelle)
console.log(rendu.equals(secret) ? '✅ la paire fonctionne' : '❌ la paire ne fonctionne pas')
