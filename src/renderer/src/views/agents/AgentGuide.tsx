import { Plus, Workflow } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { useT } from '@renderer/i18n/useT'
import { useAgents } from '@renderer/stores/agentsStore'
import { useNav } from '@renderer/stores/navStore'
import { Rich } from './Rich'

const TOC_IDS: readonly { readonly id: string; readonly key: 'what' | 'compare' | 'decide' | 'anatomy' | 'rules' | 'settings' | 'automate' }[] = [
  { id: 'g-what', key: 'what' },
  { id: 'g-compare', key: 'compare' },
  { id: 'g-decide', key: 'decide' },
  { id: 'g-anatomy', key: 'anatomy' },
  { id: 'g-rules', key: 'rules' },
  { id: 'g-settings', key: 'settings' },
  { id: 'g-automate', key: 'automate' }
]

/** Code in der Anleitung erbt die Darstellung der Fließtext-Typografie. */
const PLAIN_CODE = ''

export function AgentGuide(): React.JSX.Element {
  const t = useT().agents
  const g = t.guide
  return (
    <div className="flex min-h-0 flex-1 overflow-y-auto">
      <nav aria-label={g.navAria} className="sticky top-0 w-56 shrink-0 self-start px-8 pt-2 max-lg:hidden">
        <ul className="space-y-px border-l border-line">
          {TOC_IDS.map((entry) => (
            <li key={entry.id}>
              <a href={`#${entry.id}`} className="-ml-px block border-l border-transparent py-1 pl-3 text-xs text-ink-3 hover:border-ink-3 hover:text-ink">
                {g.toc[entry.key]}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <article className="prose-log min-w-0 flex-1 self-start px-8 pb-20 max-lg:px-5">
        <h2 id="g-what" className="!mt-0 !border-t-0 !pt-0">
          {g.toc.what}
        </h2>
        <p>
          <Rich text={g.what.p1} codeClassName={PLAIN_CODE} />
        </p>
        <p>{g.what.p2}</p>

        <h2 id="g-compare">{g.toc.compare}</h2>
        <table>
          <thead>
            <tr>
              <th />
              <th>{g.compare.colWhat}</th>
              <th>{g.compare.colWhen}</th>
            </tr>
          </thead>
          <tbody>
            {g.compare.rows.map(([name, what, when]) => (
              <tr key={name}>
                <td>
                  <strong>{name}</strong>
                </td>
                <td>{what}</td>
                <td>{when}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 id="g-decide">{g.toc.decide}</h2>
        <ul>
          <li>
            <Rich text={g.decide.auto} codeClassName={PLAIN_CODE} />
          </li>
          <li>
            <Rich text={g.decide.targeted} codeClassName={PLAIN_CODE} />
          </li>
          <li>
            <Rich text={g.decide.session} codeClassName={PLAIN_CODE} />
          </li>
        </ul>
        <p>{g.decide.precedence}</p>

        <h2 id="g-anatomy">{g.toc.anatomy}</h2>
        <p>
          <Rich text={g.anatomy.intro} codeClassName={PLAIN_CODE} />
        </p>
        <div className="not-prose my-6 overflow-hidden rounded-xl border border-line">
          {g.anatomy.parts.map((part, i) => (
            <div key={part.title} className={`grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] max-md:grid-cols-1 ${i > 0 ? 'border-t border-line' : ''}`}>
              <pre className="!m-0 !rounded-none !border-0 bg-canvas px-4 py-3 font-mono text-2xs leading-relaxed whitespace-pre-wrap text-ink-2">{part.code}</pre>
              <div className="bg-raised/50 px-4 py-3">
                <p className="!m-0 text-[0.8125rem] font-[620] text-ink">{part.title}</p>
                <p className="!mt-1 text-xs leading-relaxed text-ink-3">{part.text}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 id="g-rules">{g.toc.rules}</h2>
        <ol>
          {g.rules.items.map((r) => (
            <li key={r.title}>
              <strong>{r.title}.</strong> {r.text}
            </li>
          ))}
        </ol>
        <p>{g.rules.note}</p>

        <h2 id="g-settings">{g.toc.settings}</h2>
        <table>
          <thead>
            <tr>
              <th>{g.settings.colField}</th>
              <th>{g.settings.colMeaning}</th>
              <th>{g.settings.colAdvice}</th>
            </tr>
          </thead>
          <tbody>
            {g.settings.rows.map(([field, meaning, advice]) => (
              <tr key={field}>
                <td>
                  <code>{field}</code>
                </td>
                <td>{meaning}</td>
                <td>{advice}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 id="g-automate">{g.toc.automate}</h2>
        <p>
          <Rich text={g.automate.p1} codeClassName={PLAIN_CODE} />
        </p>
        <p>{g.automate.p2}</p>
        <div className="not-prose mt-6 flex flex-wrap gap-2">
          <Button variant="primary" icon={Plus} onClick={() => void useAgents.getState().openBuilder(null)}>
            {t.build}
          </Button>
          <Button icon={Workflow} onClick={() => useNav.getState().go('automations')}>
            {g.automate.toAutomations}
          </Button>
        </div>
      </article>
    </div>
  )
}
