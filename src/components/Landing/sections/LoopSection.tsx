import { useTranslation } from 'react-i18next';
import { LoopSteps } from '../../Method/LoopSteps';
import { ScenePanel } from '../../Method/MethodScene';
import { Reveal } from '../Reveal';

/**
 * «Твой круг»: the six steps of every story, as the scene that draws them and
 * as the list that names them — the same two pieces /how-to-use stacks.
 *
 * LoopSteps lays itself out in two columns from 640px, which suits that page's
 * wide column but squeezes each step to a sliver of text in half of this grid;
 * here it is one column, as the list in the approved design is. It takes no
 * className, so the Reveal around it reaches in to the list.
 */
export function LoopSection() {
  const { t } = useTranslation();

  return (
    <section className="reg" id="loop">
      <div className="wrap">
        <Reveal className="sec-head">
          <p className="eyebrow">{t('howToUse.loop.label')}</p>
          <h2 className="h2">{t('howToUse.loop.title')}</h2>
        </Reveal>
        <div className="grid2">
          <Reveal>
            {/* Its caption is auth.panel.loop, «каждая история — один круг». */}
            <ScenePanel scene="loop" startWhenSeen />
          </Reveal>
          <Reveal delay={120} className="sm:[&>ol]:grid-cols-1">
            <LoopSteps />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
