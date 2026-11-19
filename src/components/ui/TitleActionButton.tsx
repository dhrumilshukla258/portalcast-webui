import type { ComponentProps } from 'react';
import Button from './Button';

/** Secondary actions in the poster column: Trailer, My List and Versions. */
export default function TitleActionButton(props: ComponentProps<'button'>) {
  return <Button data-ui="title-action" className="w-full" {...props} />;
}
