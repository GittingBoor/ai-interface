import { describe, expect, it } from 'vitest'
import { SshConnection } from '../../src/main/hosts/SshConnection'

const encryptedKey = '/tmp/aii-sshd/enc'

describe.skipIf(!process.env['AII_SSH_TEST_KEY'])('SshConnection Anmeldedaten', () => {
  it('meldet einen verschlüsselten Schlüssel ohne Agent verständlich statt abzustürzen', async () => {
    const prevAgent = process.env['SSH_AUTH_SOCK']
    delete process.env['SSH_AUTH_SOCK']
    const connection = new SshConnection(
      () => ({ enabled: true, host: '127.0.0.1', port: 1, user: 'x', privateKeyPath: encryptedKey, hostFingerprint: '' }),
      () => undefined
    )
    await expect(connection.exec('true')).rejects.toMatchObject({ code: 'HOST_UNREACHABLE', message: expect.stringContaining('Passphrase') })
    if (prevAgent) process.env['SSH_AUTH_SOCK'] = prevAgent
  })
})
