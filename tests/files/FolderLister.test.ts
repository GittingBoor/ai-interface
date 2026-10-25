import { describe, expect, it } from 'vitest'
import { FolderLister } from '../../src/main/files/FolderLister'
import { FakeHost } from '../helpers/FakeHost'

function host(): FakeHost {
  const h = new FakeHost('mini-pc', '/home/alex')
  h.setFile('/home/alex/projects/b/x', '1')
  h.setFile('/home/alex/projects/a/y', '1')
  h.setFile('/home/alex/projects/.hidden/z', '1')
  h.setFile('/home/alex/projects/file.txt', '1')
  return h
}

describe('FolderLister', () => {
  it('löst ~ auf, sortiert Ordner zuerst und blendet Versteckte aus', async () => {
    const lister = new FolderLister(() => host())
    expect(await lister.list('mini-pc', '~/projects', false)).toEqual([
      { name: 'a', path: '/home/alex/projects/a', isDirectory: true, hidden: false },
      { name: 'b', path: '/home/alex/projects/b', isDirectory: true, hidden: false },
      { name: 'file.txt', path: '/home/alex/projects/file.txt', isDirectory: false, hidden: false }
    ])
  })

  it('zeigt versteckte Einträge auf Wunsch', async () => {
    const lister = new FolderLister(() => host())
    const names = (await lister.list('mini-pc', '/home/alex/projects', true)).map((e) => e.name)
    expect(names).toEqual(['.hidden', 'a', 'b', 'file.txt'])
  })

  it('home liefert das Home-Verzeichnis', async () => {
    expect(await new FolderLister(() => host()).home('mini-pc')).toBe('/home/alex')
  })
})
