import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

type MapsPaginationProps = {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

function getPaginationItems(totalPages: number, currentPage: number): (number | 'ellipsis')[] {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1)
  if (currentPage <= 3) return [1, 2, 3, 'ellipsis', totalPages]
  if (currentPage >= totalPages - 2)
    return [1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages]
  return [1, 'ellipsis', currentPage, 'ellipsis', totalPages]
}

export function MapsPagination({ currentPage, totalPages, onPageChange }: MapsPaginationProps) {
  if (totalPages <= 1) return null

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            aria-disabled={currentPage === 1}
            className={currentPage === 1 ? 'pointer-events-none opacity-50' : undefined}
            href="#"
            onClick={(event) => {
              event.preventDefault()
              if (currentPage > 1) onPageChange(currentPage - 1)
            }}
          />
        </PaginationItem>
        {getPaginationItems(totalPages, currentPage).map((item, index) =>
          item === 'ellipsis' ? (
            <PaginationItem key={`ellipsis-${index.toString()}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={item}>
              <PaginationLink
                href="#"
                isActive={item === currentPage}
                onClick={(event) => {
                  event.preventDefault()
                  onPageChange(item)
                }}
              >
                {item}
              </PaginationLink>
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          <PaginationNext
            aria-disabled={currentPage === totalPages}
            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : undefined}
            href="#"
            onClick={(event) => {
              event.preventDefault()
              if (currentPage < totalPages) onPageChange(currentPage + 1)
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
