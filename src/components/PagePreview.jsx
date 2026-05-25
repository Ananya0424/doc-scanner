{(pages[0] || pages[1]) && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <PagePreview
      page={pages[0]}
      pageNumber={1}
      onRemove={() => setPages(p => [null, p[1]])}
    />
    <PagePreview
      page={pages[1]}
      pageNumber={2}
      onRemove={() => setPages(p => [p[0], null])}
    />
  </div>
)}