import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

type PaginationBarProps = {
  baseUrl: string
  page: number
  lastPage: number
}

const SIBLINGS = 1

function buildPageNumbers(page: number, lastPage: number): (number | 'ellipsis')[] {
  const pages = new Set<number>([1, lastPage])

  for (let candidate = page - SIBLINGS; candidate <= page + SIBLINGS; candidate++) {
    if (candidate >= 1 && candidate <= lastPage) {
      pages.add(candidate)
    }
  }

  const sorted = [...pages].sort((a, b) => a - b)

  return sorted.flatMap((pageNumber, index) => {
    const previous = sorted[index - 1]
    if (previous !== undefined && pageNumber - previous > 1) {
      return ['ellipsis', pageNumber] as const
    }
    return [pageNumber] as const
  })
}

export function PaginationBar({ baseUrl, page, lastPage }: PaginationBarProps) {
  if (lastPage <= 1) {
    return null
  }

  const pageUrl = (targetPage: number) =>
    targetPage === 1 ? baseUrl : `${baseUrl}?page=${targetPage}`

  return (
    <Pagination className="justify-end">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={pageUrl(Math.max(1, page - 1))}
            aria-disabled={page === 1}
            className={page === 1 ? 'pointer-events-none opacity-50' : undefined}
            text="Précédent"
          />
        </PaginationItem>

        {buildPageNumbers(page, lastPage).map((pageNumber, index) =>
          pageNumber === 'ellipsis' ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={pageNumber}>
              <PaginationLink href={pageUrl(pageNumber)} isActive={pageNumber === page}>
                {pageNumber}
              </PaginationLink>
            </PaginationItem>
          )
        )}

        <PaginationItem>
          <PaginationNext
            href={pageUrl(Math.min(lastPage, page + 1))}
            aria-disabled={page === lastPage}
            className={page === lastPage ? 'pointer-events-none opacity-50' : undefined}
            text="Suivant"
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
