export const DEFAULT_MDX_COMPONENTS = {
    em(properties) {
      return <i style={{fontWeight: "bold", color: "red", ...(properties.style ?? {})}} {...properties} />
    }
}
