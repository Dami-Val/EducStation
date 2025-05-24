// src/components/admin/PostEditor.jsx
import React, { useState, useEffect } from 'react';
import { spacing, typography, shadows, borderRadius } from '../../styles/theme';
import { useTheme } from '../../context/ThemeContext'; // Añadir esta importación
import { createPublicacion, createPublicacionFromHTML, getPublicacionById, updatePublicacion } from '../../services/publicacionesService';
import { getAllCategorias } from '../../services/categoriasServices';
import { Calendar } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

// Componentes para el editor
import DualModeEditor from './DualModeEditor';
import PostMetadata from './PostMetadata';
import CoverImageUploader from './CoverImageUploader';
import StatusMessage from './StatusMessage';
import ImportExportActions from './ImportExportActions';

// Funciones para almacenamiento local
const savePostToLocalStorage = (post) => {
  try {
    const postToSave = { ...post };
    // No guardamos la imagen como tal, sino solo la URL de vista previa
    delete postToSave.coverImage;
    // Incluimos el resumen en los datos guardados
    postToSave.lastSaved = new Date().toISOString();
    localStorage.setItem('post_draft', JSON.stringify(postToSave));
    console.log('Saved to localStorage:', postToSave); // Debug
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

const loadPostFromLocalStorage = () => {
  try {
    const savedPost = localStorage.getItem('post_draft');
    return savedPost ? JSON.parse(savedPost) : null;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return null;
  }
};

// Componente para la etiqueta de Contenido animada
const ContentLabel = () => {
  const [isAnimated, setIsAnimated] = useState(false);
  const { colors, isDarkMode } = useTheme(); // Obtener colores del tema

  useEffect(() => {
    // Activar animación después de un breve retraso
    const timer = setTimeout(() => {
      setIsAnimated(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const styles = {
    container: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: spacing.md,
      transform: isAnimated ? 'translateX(0)' : 'translateX(-20px)',
      opacity: isAnimated ? 1 : 0,
      transition: 'all 0.6s ease-out'
    },
    icon: {
      fontSize: '22px',
      marginRight: spacing.sm,
      color: colors.secondary,
      animation: isAnimated ? 'pulseIcon 2s infinite' : 'none'
    },
    label: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semiBold,
      color: isDarkMode ? colors.textLight : colors.primary, // Ajustar color según el tema
      position: 'relative',
      paddingBottom: '3px'
    },
    underline: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      width: isAnimated ? '100%' : '0%',
      height: '2px',
      backgroundColor: colors.secondary,
      transition: 'width 0.8s ease-in-out',
      transitionDelay: '0.3s'
    },
    badge: {
      display: 'inline-block',
      backgroundColor: isAnimated ? colors.primary : 'transparent',
      color: 'white',
      padding: `${spacing.xs} ${spacing.sm}`,
      borderRadius: borderRadius.round,
      fontSize: typography.fontSize.xs,
      marginLeft: spacing.md,
      transform: isAnimated ? 'scale(1)' : 'scale(0)',
      transition: 'all 0.5s ease-out',
      transitionDelay: '0.6s',
      boxShadow: isAnimated ? '0 2px 4px rgba(11, 68, 68, 0.2)' : 'none'
    }
  };

  return (
    <div style={styles.container}>
      <span style={styles.icon}>📝</span>
      <h3 style={styles.label}>
        Contenido
        <span style={styles.underline}></span>
      </h3>
      <span style={styles.badge}>Editor</span>
    </div>
  );
};

// Componente mejorado para indicadores de progreso
const ProgressIndicator = ({ currentStep, totalSteps, steps }) => {
  const { colors, isDarkMode } = useTheme();
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `${spacing.md} 0`,
      marginBottom: spacing.lg,
      borderBottom: `1px solid ${colors.gray200}`,
      animation: 'slideInUp 0.6s ease-out'
    }}>
      {steps.map((step, index) => (
        <div key={index} style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flex: 1,
          position: 'relative'
        }}>
          {/* Línea conectora */}
          {index < steps.length - 1 && (
            <div style={{
              position: 'absolute',
              top: '15px',
              left: '50%',
              width: '100%',
              height: '2px',
              backgroundColor: index < currentStep ? colors.secondary : colors.gray200,
              zIndex: 0,
              transition: 'all 0.5s ease'
            }} />
          )}
          
          {/* Círculo del paso */}
          <div style={{
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            backgroundColor: index <= currentStep ? colors.secondary : colors.gray200,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '14px',
            position: 'relative',
            zIndex: 1,
            transition: 'all 0.3s ease',
            transform: index === currentStep ? 'scale(1.1)' : 'scale(1)',
            boxShadow: index === currentStep ? `0 0 0 3px ${colors.secondary}30` : 'none'
          }}>
            {index < currentStep ? '✓' : index + 1}
          </div>
          
          {/* Etiqueta del paso */}
          <span style={{
            marginTop: spacing.xs,
            fontSize: typography.fontSize.sm,
            color: index <= currentStep ? colors.primary : colors.gray400,
            fontWeight: index === currentStep ? typography.fontWeight.semiBold : typography.fontWeight.normal,
            transition: 'all 0.3s ease'
          }}>
            {step}
          </span>
        </div>
      ))}
    </div>
  );
};

// Componente mejorado para estadísticas del post en tiempo real
const PostStats = ({ content, title, category, tags }) => {
  const { colors, isDarkMode } = useTheme();
  
  const [stats, setStats] = useState({
    words: 0,
    characters: 0,
    readingTime: 0,
    completeness: 0
  });

  useEffect(() => {
    // Extraer texto plano del HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content || '';
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    const words = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
    const characters = plainText.length;
    const readingTime = Math.ceil(words / 200); // 200 palabras por minuto
    
    // Calcular completitud
    let completeness = 0;
    if (title) completeness += 25;
    if (category) completeness += 25;
    if (words > 50) completeness += 25;
    if (tags) completeness += 25;
    
    setStats({ words, characters, readingTime, completeness });
  }, [content, title, category, tags]);

  const statItems = [
    { label: 'Palabras', value: stats.words, icon: '📝', color: colors.primary },
    { label: 'Caracteres', value: stats.characters, icon: '🔤', color: colors.secondary },
    { label: 'Lectura', value: `${stats.readingTime} min`, icon: '⏱️', color: '#e67e22' },
    { label: 'Completitud', value: `${stats.completeness}%`, icon: '📊', color: '#27ae60' }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: spacing.md,
      padding: spacing.md,
      backgroundColor: isDarkMode ? colors.backgroundDarkSecondary : '#f8f9fa',
      borderRadius: borderRadius.md,
      marginBottom: spacing.lg,
      animation: 'fadeIn 0.8s ease-out'
    }}>
      {statItems.map((stat, index) => (
        <div key={index} style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: spacing.sm,
          backgroundColor: isDarkMode ? colors.backgroundDark : colors.white,
          borderRadius: borderRadius.sm,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        }}>
          <span style={{ fontSize: '20px', marginBottom: spacing.xs }}>{stat.icon}</span>
          <span style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.bold,
            color: stat.color,
            marginBottom: spacing.xxs
          }}>
            {stat.value}
          </span>
          <span style={{
            fontSize: typography.fontSize.sm,
            color: colors.gray500,
            textAlign: 'center'
          }}>
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
};

// Componente mejorado para consejos interactivos
const WritingTips = ({ content, category }) => {
  const { colors, isDarkMode } = useTheme();
  const [currentTip, setCurrentTip] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const tips = [
    {
      icon: '💡',
      title: 'Usa encabezados',
      description: 'Organiza tu contenido con H1, H2 y H3 para mejor legibilidad',
      category: 'estructura'
    },
    {
      icon: '📸',
      title: 'Añade imágenes',
      description: 'Las imágenes hacen tu contenido más atractivo y fácil de entender',
      category: 'visual'
    },
    {
      icon: '🎯',
      title: 'Sé específico',
      description: 'Usa ejemplos concretos y datos para respaldar tus ideas',
      category: 'contenido'
    },
    {
      icon: '✨',
      title: 'Revisa la ortografía',
      description: 'Un texto sin errores transmite profesionalismo y credibilidad',
      category: 'calidad'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'relative',
      padding: spacing.md,
      backgroundColor: isDarkMode ? colors.backgroundDarkSecondary : '#e8f4fd',
      borderRadius: borderRadius.md,
      border: `1px solid ${colors.secondary}40`,
      marginBottom: spacing.lg,
      animation: 'slideInUp 0.6s ease-out'
    }}>
      <button
        onClick={() => setIsVisible(false)}
        style={{
          position: 'absolute',
          top: spacing.xs,
          right: spacing.xs,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: colors.gray400,
          fontSize: '18px',
          padding: spacing.xs,
          borderRadius: '50%',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = colors.gray200;
          e.target.style.color = colors.gray600;
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = 'transparent';
          e.target.style.color = colors.gray400;
        }}
      >
        ×
      </button>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: spacing.sm
      }}>
        <span style={{ fontSize: '24px', marginRight: spacing.sm }}>
          {tips[currentTip].icon}
        </span>
        <h4 style={{
          margin: 0,
          color: colors.primary,
          fontSize: typography.fontSize.md,
          fontWeight: typography.fontWeight.semiBold
        }}>
          Consejo: {tips[currentTip].title}
        </h4>
      </div>
      
      <p style={{
        margin: 0,
        color: colors.textPrimary,
        fontSize: typography.fontSize.sm,
        lineHeight: '1.5'
      }}>
        {tips[currentTip].description}
      </p>
      
      {/* Indicadores de progreso */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginTop: spacing.sm,
        gap: spacing.xs
      }}>
        {tips.map((_, index) => (
          <div
            key={index}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: index === currentTip ? colors.secondary : colors.gray300,
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onClick={() => setCurrentTip(index)}
          />
        ))}
      </div>
    </div>
  );
};

const PostEditor = () => {
  // Obtener los colores del tema actual
  const { colors, isDarkMode } = useTheme();
  const { postId } = useParams(); // Obtener el ID del post de los parámetros de la URL
  const navigate = useNavigate();

  const [post, setPost] = useState({
    title: '',
    category: '',
    content: '', // Aseguramos que se inicie con una cadena vacía
    tags: '',
    coverImage: null,
    coverImagePreview: null,
    status: 'draft', // 'draft', 'published'
    publishDate: new Date().toISOString().slice(0, 10),
    editorMode: 'simple', // Set default mode to 'simple'
    resumen: '', // Añadimos el campo resumen
  });

  const [isEditing, setIsEditing] = useState(false); // Estado para saber si estamos editando un post existente
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  // Estado para controlar qué categoría tiene el cursor encima
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Estados adicionales para la interfaz mejorada
  const [currentStep, setCurrentStep] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [focusedSection, setFocusedSection] = useState(null);

  // Pasos del proceso de creación
  const creationSteps = ['Configurar', 'Escribir', 'Revisar', 'Publicar'];

  // Función para calcular el paso actual basado en el progreso
  const calculateCurrentStep = () => {
    if (!post.title) return 0;
    if (!post.content || post.content.length < 100) return 1;
    if (!post.category) return 2;
    return 3;
  };

  // Actualizar el paso actual cuando cambie el contenido
  useEffect(() => {
    const step = calculateCurrentStep();
    setCurrentStep(step);
  }, [post.title, post.content, post.category]);

  // Definir descripciones de categorías para los tooltips
  const categoryDescriptions = {
    "Noticias": "Información actualizada sobre eventos y novedades en el ámbito educativo.",
    "Técnicas de Estudio": "Métodos y estrategias para optimizar el aprendizaje y mejorar el rendimiento académico.",
    "Técnicas": "Métodos y estrategias para optimizar el aprendizaje y mejorar el rendimiento académico.",
    "Problemáticas": "Análisis de desafíos y obstáculos en el sistema educativo actual.",
    "Problemáticas en el Estudio": "Análisis de desafíos y obstáculos en el sistema educativo actual.",
    "Educación de Calidad": "Estándares, prácticas y enfoques para una enseñanza de excelencia.",
    "Herramientas": "Recursos tecnológicos y pedagógicos para facilitar la labor docente.",
    "Herramientas Tecnológicas": "Recursos tecnológicos y pedagógicos para facilitar la labor docente.",
    "Desarrollo Docente": "Oportunidades de crecimiento profesional y capacitación para educadores.",
    "Desarrollo Profesional Docente": "Oportunidades de crecimiento profesional y capacitación para educadores.",
    "Comunidad": "Espacios de colaboración e intercambio entre miembros de la comunidad educativa.",
    "Comunidad y Colaboración": "Espacios de colaboración e intercambio entre miembros de la comunidad educativa."
  };

  // Estilos para animaciones de tooltips
  const keyframes = `
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 0.98;
        transform: translateY(0);
      }
    }
    
    @keyframes fadeOut {
      from {
        opacity: 0.98;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(8px);
      }
    }

    .tooltip-arrow {
      position: absolute;
      bottom: -8px;
      left: 50%;
      margin-left: -8px;
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-top: 8px solid white;
    }
  `;

  // Cargar categorías desde el backend
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const data = await getAllCategorias();
        console.log("Categorías cargadas:", data);
        if (data && Array.isArray(data)) {
          setCategories(data);
        } else {
          // Si no hay datos o no es un array, usar categorías predeterminadas
          setCategories([
            { ID_categoria: 1, Nombre_categoria: 'Noticias' },
            { ID_categoria: 2, Nombre_categoria: 'Técnicas de Estudio' },
            { ID_categoria: 3, Nombre_categoria: 'Problemáticas en el Estudio' },
            { ID_categoria: 4, Nombre_categoria: 'Educación de Calidad' },
            { ID_categoria: 5, Nombre_categoria: 'Herramientas Tecnológicas' },
            { ID_categoria: 6, Nombre_categoria: 'Desarrollo Profesional Docente' },
            { ID_categoria: 7, Nombre_categoria: 'Comunidad y Colaboración' }
          ]);
        }
      } catch (error) {
        console.error('Error al cargar categorías:', error);
        // Usar categorías predeterminadas en caso de error
        setCategories([
          { ID_categoria: 1, Nombre_categoria: 'Noticias' },
          { ID_categoria: 2, Nombre_categoria: 'Técnicas de Estudio' },
          { ID_categoria: 3, Nombre_categoria: 'Problemáticas en el Estudio' },
          { ID_categoria: 4, Nombre_categoria: 'Educación de Calidad' },
          { ID_categoria: 5, Nombre_categoria: 'Herramientas Tecnológicas' },
          { ID_categoria: 6, Nombre_categoria: 'Desarrollo Profesional Docente' },
          { ID_categoria: 7, Nombre_categoria: 'Comunidad y Colaboración' }
        ]);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Cerrar el dropdown cuando se hace clic fuera de él
  useEffect(() => {
    if (!dropdownOpen) return;

    const handleClickOutside = (event) => {
      if (!event.target.closest('[data-dropdown]')) {
        setDropdownOpen(false);
        setHoveredCategory(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup: remover el listener cuando el componente se desmonte
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Cargar post existente si hay un postId
  useEffect(() => {
    const loadExistingPost = async () => {
      if (postId) {
        try {
          const postData = await getPublicacionById(postId);
          console.log('Post cargado para edición:', postData);
          
          // Encontrar la categoría por su ID
          let categoryName = '';
          if (postData.categorias && postData.categorias.length > 0 && categories.length > 0) {
            const category = categories.find(cat => 
              cat.ID_categoria === postData.categorias[0].ID_categoria
            );
            if (category) {
              categoryName = category.Nombre_categoria;
            }
          }
          
          setPost({
            title: postData.Titulo || '',
            category: categoryName,
            content: postData.contenido || '',
            tags: '',
            coverImage: null,
            coverImagePreview: postData.Imagen_portada ? 
              (postData.Imagen_portada.startsWith('data:') ? 
                postData.Imagen_portada : 
                `data:image/jpeg;base64,${postData.Imagen_portada}`) : 
              null,
            status: postData.Estado || 'draft',
            publishDate: postData.Fecha_publicacion ? 
              new Date(postData.Fecha_publicacion).toISOString().slice(0, 10) : 
              new Date().toISOString().slice(0, 10),
            editorMode: 'simple',
            resumen: postData.Resumen || '',
            Imagen_portada: postData.Imagen_portada || null
          });
          
          setIsEditing(true);
          setSaveMessage({
            type: 'success',
            text: 'Post cargado correctamente para edición',
            icon: '✓'
          });
          
          setTimeout(() => setSaveMessage(null), 3000);
        } catch (error) {
          console.error('Error al cargar el post para edición:', error);
          setSaveMessage({
            type: 'error',
            text: `Error al cargar el post: ${error.message}`,
            icon: '✖'
          });
          
          setTimeout(() => setSaveMessage(null), 3000);
        }
      }
    };
    
    // Solo cargar el post después de que las categorías estén disponibles
    if (categories.length > 0 && postId) {
      loadExistingPost();
    }
  }, [postId, categories]);

  // Manejador para cambios en los campos del formulario
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Log para depuración
    console.log(`Changing ${name} to ${value}`);

    setPost(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Manejador específico para cambios del DualModeEditor
  const handleEditorChange = (eventOrContent) => {
    // Si es un string directo (contenido), manejar como contenido
    if (typeof eventOrContent === 'string') {
      console.log('DualModeEditor - Actualizando contenido:', eventOrContent.substring(0, 50) + '...');
      setPost(prev => ({ ...prev, content: eventOrContent }));
      return;
    }

    // Si es un evento del editor, verificar qué tipo de cambio es
    if (eventOrContent && eventOrContent.target) {
      const { name, value } = eventOrContent.target;
      
      console.log(`DualModeEditor - Changing ${name} to ${value}`);
      
      if (name === 'content') {
        // Cambio de contenido
        setPost(prev => ({ ...prev, content: value }));
      } else if (name === 'editorMode') {
        // Cambio de modo del editor
        console.log('DualModeEditor - Cambiando modo del editor a:', value);
        setPost(prev => ({ ...prev, editorMode: value }));
      } else {
        // Otros cambios
        setPost(prev => ({ ...prev, [name]: value }));
      }
    }
  };

  // Manejador para cambios en la imagen de portada
  const handleImageChange = (e, base64Image) => {
    const file = e.target.files[0];
    if (file) {
      console.log("Imagen Base64 recibida:", base64Image ? base64Image.substring(0, 50) + "..." : "No hay imagen Base64");
      // Guardar tanto el archivo como la vista previa
      setPost(prev => ({
        ...prev,
        coverImage: file,
        coverImagePreview: URL.createObjectURL(file),
        // Guardar la versión Base64 de la imagen para enviarla al backend
        Imagen_portada: base64Image || null
      }));
    }
  };

  // Cargar datos guardados en localStorage al iniciar
  useEffect(() => {
    // Cargar borrador del almacenamiento local
    const savedPost = loadPostFromLocalStorage();
    if (savedPost) {
      setPost(prev => ({
        ...prev,
        ...savedPost,
        // Asegurarnos que editorMode existe y tiene un valor válido
        editorMode: savedPost.editorMode || 'simple'
      }));
    }
    
    // Marcar como inicializado después de cargar
    setIsInitialized(true);
    
    // Auto-guardado cada 30 segundos
    let interval;
    setTimeout(() => {
      interval = setInterval(() => {
        if (post.title || post.content) {
          saveDraft();
        }
      }, 30000);
    }, 5000); // Esperar 5 segundos antes de iniciar el intervalo
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // Autoguardado cuando el contenido cambia
  useEffect(() => {
    if (post.content.length > 0 || post.title.length > 0) {
      savePostToLocalStorage(post);
    }
  }, [post]);

  // Guardar como borrador
  const saveDraft = async () => {
    // Validación básica
    if (!post.title.trim()) {
      setSaveMessage({
        type: 'error',
        text: 'Por favor añade un título a tu publicación',
        icon: '✖'
      });
      
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Convertir la categoría seleccionada a un ID numérico si existe
      let categorias = [];
      if (post.category) {
        // Buscar el ID de la categoría seleccionada
        const categoriaSeleccionada = categories.find(cat => 
          typeof cat === 'object' ? cat.Nombre_categoria === post.category : cat === post.category
        );
        
        if (typeof categoriaSeleccionada === 'object' && categoriaSeleccionada.ID_categoria) {
          categorias = [categoriaSeleccionada.ID_categoria];
        } else if (post.category) {
          // Si no encontramos el ID pero hay una categoría seleccionada, usamos 1 como valor predeterminado
          console.warn("No se pudo encontrar el ID de la categoría, usando valor predeterminado");
          categorias = [1];
        }
      }
      
      // Preparar los datos para el backend
      const postData = {
        titulo: post.title,
        contenido: post.content,
        resumen: post.resumen || post.title.substring(0, 150), // Usar el resumen o parte del título como resumen si no existe
        estado: 'borrador',
        categorias: categorias,
        Imagen_portada: post.Imagen_portada || null // Enviar la imagen en Base64 si existe
      };
      
      console.log("Guardando borrador con datos:", postData);
      
      // Guardar en el backend
      let result;
      
      if (isEditing) {
        // Si estamos editando un post existente, usamos updatePublicacion
        console.log(`Actualizando borrador existente con ID: ${postId}`);
        result = await updatePublicacion(postId, postData);
      } else {
        // Si es un nuevo post, usamos createPublicacion
        result = await createPublicacion(postData);
      }
      
      // Guardar en localStorage como respaldo
      savePostToLocalStorage(post);
      
      setIsSaving(false);
      setSaveMessage({
        type: 'success',
        text: 'Borrador guardado correctamente',
        icon: '✓'
      });
      
      // Limpiar mensaje después de unos segundos
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error al guardar borrador:', error);
      setIsSaving(false);
      setSaveMessage({
        type: 'error',
        text: `Error al guardar: ${error.message}`,
        icon: '✖'
      });
      
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  // Publicar el post
  const publishPost = async () => {
    // Validación básica
    if (!post.title.trim() || !post.content.trim() || !post.category) {
      setSaveMessage({
        type: 'error',
        text: 'Por favor completa al menos el título, categoría y contenido del post',
        icon: '✖'
      });
      
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }
    
    setIsPublishing(true);
    
    try {
      // Convertir la categoría seleccionada a un ID numérico
      // Buscar el ID de la categoría seleccionada
      const categoriaSeleccionada = categories.find(cat => 
        typeof cat === 'object' ? cat.Nombre_categoria === post.category : cat === post.category
      );
      
      let categoriaId;
      if (typeof categoriaSeleccionada === 'object' && categoriaSeleccionada.ID_categoria) {
        categoriaId = categoriaSeleccionada.ID_categoria;
      } else {
        // Si no encontramos el ID, usamos 1 como valor predeterminado (asumiendo que existe)
        console.warn("No se pudo encontrar el ID de la categoría, usando valor predeterminado");
        categoriaId = 1;
      }
      
      // Preparar los datos para el backend
      const postData = {
        titulo: post.title,
        contenido: post.content,
        resumen: post.resumen || post.title.substring(0, 150), // Usar el resumen o parte del título como resumen si no existe
        estado: 'publicado',
        categorias: [categoriaId], // Usar el ID numérico de la categoría
        Imagen_portada: post.Imagen_portada || null // Enviar la imagen en Base64 si existe
      };
      
      console.log("Enviando publicación con datos:", postData);
      // Verificar si la imagen está presente
      if (post.Imagen_portada) {
        console.log("Imagen incluida en la publicación (primeros 50 caracteres):", post.Imagen_portada.substring(0, 50) + "...");
        console.log("Longitud de la imagen Base64:", post.Imagen_portada.length);
      } else {
        console.log("No se incluyó imagen en la publicación");
      }
      
      // Determinar qué endpoint usar según el modo del editor y si es una edición o creación
      let result;
      
      if (isEditing) {
        // Si estamos editando un post existente, usamos updatePublicacion
        console.log(`Actualizando post existente con ID: ${postId}`);
        result = await updatePublicacion(postId, postData);
        setSaveMessage({
          type: 'success',
          text: '¡Post actualizado correctamente!',
          icon: '🎉'
        });
      } else {
        // Si es un nuevo post, usamos createPublicacion o createPublicacionFromHTML
        if (post.editorMode === 'html') {
          console.log("Usando endpoint HTML con contenido HTML de longitud:", post.content.length);
          console.log("Muestra del contenido HTML:", post.content.substring(0, 150) + "...");
          
          // Verificar que el contenido no sea vacío o solo espacios
          if (!post.content.trim()) {
            throw new Error("El contenido HTML está vacío o solo contiene espacios");
          }
          
          // Verificar que el contenido tenga etiquetas HTML válidas
          if (!post.content.includes("<") || !post.content.includes(">")) {
            console.warn("El contenido no parece contener etiquetas HTML válidas");
          }
          
          result = await createPublicacionFromHTML({
            titulo: postData.titulo,
            htmlContent: post.content, // Aquí está el cambio clave: enviamos el contenido como htmlContent
            resumen: post.resumen || postData.resumen,
            estado: postData.estado,
            categorias: postData.categorias,
            Imagen_portada: postData.Imagen_portada // Enviar la imagen en Base64
          });
        } else {
          result = await createPublicacion(postData);
        }
        
        setSaveMessage({
          type: 'success',
          text: '¡Post publicado correctamente!',
          icon: '🎉'
        });
      }
      
      setIsPublishing(false);
      setPost(prev => ({ ...prev, status: 'published' }));
      
      // Limpiar mensaje después de unos segundos
      setTimeout(() => setSaveMessage(null), 3000);
      
      // Limpieza del borrador en localStorage después de publicar
      localStorage.removeItem('post_draft');
      
      // Redireccionar al panel de administración después de publicar/actualizar
      setTimeout(() => {
        navigate('/admin/panel', { state: { forceReload: true } });
      }, 1500);
    } catch (error) {
      console.error('Error al publicar:', error);
      setIsPublishing(false);
      setSaveMessage({
        type: 'error',
        text: `Error al publicar: ${error.message}`,
        icon: '✖'
      });
      
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  // Exportar el post a HTML para descargar
  const exportToFile = () => {
    try {
      // Prepare the data for export (including the resumen field)
      const postData = {
        title: post.title,
        content: post.content,
        category: post.category,
        tags: post.tags,
        status: post.status,
        publishDate: post.publishDate,
        editorMode: post.editorMode,
        resumen: post.resumen,
        // We don't include the image as it's a File object which can't be serialized
        // But we could include the coverImagePreview URL
        coverImagePreview: post.coverImagePreview
      };
      
      // Convert to JSON
      const jsonData = JSON.stringify(postData, null, 2);
      
      // Create a blob from the JSON data
      const blob = new Blob([jsonData], { type: 'application/json' });
      
      // Create a download link and trigger it
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${post.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.json`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      // Show success message
      setSaveMessage({
        type: 'success',
        text: 'Post exportado correctamente',
        icon: '📤'
      });
      
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error al exportar post:', error);
      setSaveMessage({
        type: 'error',
        text: 'Error al exportar: ' + error.message,
        icon: '✖'
      });
      
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  // Importar un archivo HTML
  const importFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        // Parse the imported JSON data
        const importedData = JSON.parse(event.target.result);
        
        // Update the post state with the imported data
        setPost(prev => ({
          ...prev,
          title: importedData.title || '',
          content: importedData.content || '',
          category: importedData.category || '',
          tags: importedData.tags || '',
          status: importedData.status || 'draft',
          publishDate: importedData.publishDate || new Date().toISOString().slice(0, 10),
          editorMode: importedData.editorMode || 'simple',
          resumen: importedData.resumen || '',
          coverImagePreview: importedData.coverImagePreview || null
        }));
        
        // Show success message
        setSaveMessage({
          type: 'success',
          text: 'Post importado correctamente',
          icon: '📥'
        });
        
        setTimeout(() => setSaveMessage(null), 3000);
      } catch (error) {
        console.error('Error al importar archivo:', error);
        setSaveMessage({
          type: 'error',
          text: 'Error al importar: formato inválido',
          icon: '✖'
        });
        
        setTimeout(() => setSaveMessage(null), 3000);
      }
    };
    
    reader.readAsText(file);
  };

  // Estilos CSS
  const styles = {
    container: {
      maxWidth: "1200px",
      margin: "0 auto",
      padding: `${"100px"} ${spacing.md}`,
      fontFamily: typography.fontFamily
    },
    editorContainer: {
      display: "grid",
      // Cambiado: Invertir el orden de las columnas para que la barra lateral esté a la izquierda
      gridTemplateColumns: "300px 1fr",
      gap: spacing.xl,
      marginBottom: spacing.xxl
    },
    mainEditor: {
      width: "100%",
      maxWidth: "800px" // Anchura predefinida para el contenido del post
    },
    sidebar: {
      // No necesita cambios específicos de estilo aquí
    },
    formGroup: {
      marginBottom: spacing.lg
    },
    actionsContainer: {
      display: "flex",
      justifyContent: "space-between",
      gap: spacing.md,
      marginTop: spacing.xl
    },
    actionButton: {
      padding: `${spacing.sm} ${spacing.lg}`,
      borderRadius: borderRadius.md,
      fontWeight: typography.fontWeight.medium,
      cursor: "pointer",
      transition: "all 0.3s ease",
      fontSize: typography.fontSize.md,
      border: "none",
      // Estilos específicos se aplicarán en cada botón
    },
    saveButton: {
      backgroundColor: colors.secondary,
      color: colors.primary,
      "&:hover": {
        backgroundColor: colors.secondary + "cc", // Añadir transparencia al hover
      }
    },
    publishButton: {
      backgroundColor: colors.primary,
      color: colors.white,
      "&:hover": {
        backgroundColor: colors.primaryLight,
      }
    }
  };

  // Modificar el componente PostMetadata para usar las categorías cargadas
  const renderPostMetadata = () => {
    return (
      <div style={{
        marginTop: spacing.lg,
        backgroundColor: isDarkMode ? colors.backgroundDarkSecondary : colors.white,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        boxShadow: shadows.sm
      }}>
        <h3 style={{
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.semiBold,
          marginBottom: spacing.md,
          color: isDarkMode ? colors.textLight : colors.primary
        }}>Detalles de la publicación</h3>

        <div style={{ marginBottom: spacing.md, position: 'relative' }}>
          <label style={{
            display: 'block',
            marginBottom: spacing.xs,
            fontWeight: typography.fontWeight.medium,
            color: isDarkMode ? colors.textLight : colors.textPrimary
          }} htmlFor="category">
            <span style={{ color: colors.secondary, fontSize: '1.1em', marginRight: spacing.xs }}></span>
            Categoría
          </label>

          {/* Custom Dropdown Implementation */}
          <div style={{
            position: "relative",
            width: "100%",
          }}>
            <div
              style={{
                width: "100%",
                padding: spacing.sm,
                borderRadius: borderRadius.md,
                border: `1px solid ${colors.gray200}`,
                fontSize: typography.fontSize.md,
                backgroundColor: isDarkMode ? colors.backgroundDark : colors.white,
                borderLeft: `4px solid ${colors.secondary}`,
                transition: "all 0.3s ease",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                color: isDarkMode ? colors.textLight : colors.textPrimary,
                boxShadow: dropdownOpen ? `0 0 0 2px ${colors.secondary}30` : 'none'
              }}
              onClick={() => setDropdownOpen(!dropdownOpen)}
              data-dropdown
            >
              {post.category || "Selecciona una categoría"}
              <span style={{
                marginLeft: spacing.sm,
                transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)',
                transition: 'transform 0.2s ease-in-out'
              }}>▼</span>
            </div>

            {dropdownOpen && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 5px)",
                left: 0,
                right: 0,
                backgroundColor: colors.white,
                borderRadius: borderRadius.md,
                border: `1px solid ${colors.gray200}`,
                //borderLeft: `4px solid ${colors.secondary}`,
                boxShadow: shadows.md,
                zIndex: 20,
                maxHeight: "300px",
                overflowY: "auto",
                width: "100%"
              }}
                data-dropdown
              >
                <div
                  style={{
                    padding: `${spacing.sm} ${spacing.md}`,
                    paddingLeft: spacing.md,
                    cursor: "pointer",
                    borderBottom: `1px solid ${colors.gray200}`,
                    transition: "background-color 0.2s ease",
                    position: "relative",
                    color: colors.primary, // Cambiado a color primario
                    backgroundColor: 'transparent',
                    borderLeft: 'none'
                  }}
                  onClick={() => {
                    handleChange({ target: { name: 'category', value: '' } });
                    setDropdownOpen(false);
                    setHoveredCategory(null);
                  }}
                >
                  Selecciona una categoría
                </div>

                {categories.map((cat) => {
                  const categoryName = typeof cat === 'object' ? cat.Nombre_categoria : cat;
                  const isSelected = post.category === categoryName;

                  return (
                    <div
                      key={categoryName}
                      style={{
                        padding: `${spacing.sm} ${spacing.md}`,
                        paddingLeft: spacing.md,
                        cursor: "pointer",
                        borderBottom: `1px solid ${colors.gray200}`,
                        transition: "all 0.2s ease",
                        position: "relative",
                        backgroundColor: hoveredCategory === categoryName
                          ? colors.secondary + '15' // Reducido de 25% a 15% para hover
                          : isSelected
                            ? colors.secondary + '08' // Reducido de 15% a 8% para selección
                            : 'transparent',
                        color: colors.primary, // Color de texto
                        fontWeight: isSelected ? typography.fontWeight.bold : typography.fontWeight.normal,
                        borderLeft: 'none'
                      }}
                      onClick={() => {
                        handleChange({ target: { name: 'category', value: categoryName } });
                        setDropdownOpen(false);
                        setHoveredCategory(null);
                      }}
                      onMouseEnter={() => setHoveredCategory(categoryName)}
                      onMouseLeave={() => setHoveredCategory(null)}
                    >
                      {categoryName}

                      {/* Tooltip de descripción */}
                      {hoveredCategory === categoryName && categoryDescriptions[categoryName] && (
                        <div style={{
                          position: "absolute",
                          top: "-50px",
                          left: 0,
                          right: 0,
                          backgroundColor: colors.white,
                          color: colors.primary,
                          padding: spacing.sm,
                          borderRadius: borderRadius.md,
                          fontSize: typography.fontSize.sm,
                          border: `1px solid ${colors.gray200}`,
                          borderLeft: `4px solid ${colors.primary}`,
                          boxShadow: `0 3px 6px rgba(0,0,0,0.1)`,
                          zIndex: 100,
                          width: "100%",
                          opacity: 0.98,
                          animation: "fadeIn 0.2s ease-in-out",
                          pointerEvents: "none",
                          fontWeight: typography.fontWeight.medium,
                          maxWidth: "100%",
                          whiteSpace: "normal",
                          lineHeight: "1.4",
                          textAlign: "left"
                        }}>
                          {categoryDescriptions[categoryName]}
                          <span className="tooltip-arrow"></span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>


        <div style={{ marginBottom: spacing.md, position: 'relative' }}>
          <label style={{
            display: 'block',
            marginBottom: spacing.xs,
            fontWeight: typography.fontWeight.medium,
            color: isDarkMode ? colors.textLight : colors.textPrimary
          }} htmlFor="publishDate">
            Fecha de publicación
          </label>

          {/* Campo de fecha con estilo similar a categorías y etiquetas */}
          <div style={{
            position: "relative",
            width: "100%",
          }}>
            <div style={{
              width: "100%",
              padding: spacing.sm,
              borderRadius: borderRadius.md,
              border: `1px solid ${colors.gray200}`,
              fontSize: typography.fontSize.md,
              backgroundColor: isDarkMode ? colors.backgroundDark : colors.white,
              transition: "all 0.3s ease",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              color: isDarkMode ? colors.textLight : colors.textPrimary,
              pointerEvents: "none", // Deshabilita interacciones con el contenedor
            }}>
              <input
                type="text"
                id="publishDate"
                name="publishDate"
                value={new Date().toLocaleDateString('es-ES')}
                readOnly
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  padding: "0",
                  fontSize: typography.fontSize.md,
                  backgroundColor: "transparent",
                  color: isDarkMode ? colors.textLight : colors.textPrimary,
                  cursor: "default" // Cambia el cursor para indicar que no es interactivo
                }}
              />
              <Calendar size={18} color={colors.gray400} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Solo renderizar una vez inicializado para evitar problemas de redimensión
  if (loadingCategories) {
    return (
      <div style={{
        ...styles.container,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: spacing.md
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: `3px solid ${colors.gray200}`,
            borderTop: `3px solid ${colors.secondary}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <span style={{
            color: colors.textPrimary,
            fontSize: typography.fontSize.md
          }}>
            Cargando categorías...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Estilos CSS en línea para animaciones */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideInUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes slideInLeft {
            from { transform: translateX(-20px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes pulseIcon {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
          }
          .section-card {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            transform: translateZ(0);
          }
          .section-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.12);
          }
          .input-field {
            transition: all 0.3s ease;
          }
          .input-field:focus {
            transform: scale(1.02);
            box-shadow: 0 0 0 3px ${colors.secondary}20;
          }
          ${keyframes}
        `
      }} />

      {/* Header con indicador de progreso */}
      <div style={{
        backgroundColor: isDarkMode ? colors.backgroundDarkSecondary : colors.white,
        padding: `${spacing.lg} ${spacing.xl}`,
        borderRadius: `${borderRadius.lg} ${borderRadius.lg} 0 0`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: spacing.md,
        animation: 'slideInUp 0.5s ease-out'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.lg
        }}>
          <div>
            <h1 style={{
              fontSize: typography.fontSize.xxl,
              fontWeight: typography.fontWeight.bold,
              color: colors.primary,
              margin: 0,
              marginBottom: spacing.xs
            }}>
              {isEditing ? 'Editar Publicación' : 'Nueva Publicación'}
            </h1>
            <p style={{
              fontSize: typography.fontSize.md,
              color: colors.gray500,
              margin: 0
            }}>
              {isEditing ? 'Modifica tu contenido existente' : 'Crea contenido educativo impactante'}
            </p>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md
          }}>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              style={{
                background: 'none',
                border: `1px solid ${colors.gray300}`,
                borderRadius: borderRadius.md,
                padding: spacing.sm,
                cursor: 'pointer',
                color: colors.gray600,
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = colors.gray100;
                e.target.style.borderColor = colors.gray400;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.borderColor = colors.gray300;
              }}
            >
              {isExpanded ? '📐 Vista Compacta' : '📏 Vista Expandida'}
            </button>
          </div>
        </div>

        {/* Indicador de progreso */}
        <ProgressIndicator 
          currentStep={currentStep}
          totalSteps={creationSteps.length}
          steps={creationSteps}
        />
      </div>

      {/* Layout principal mejorado */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isExpanded ? '1fr' : '1fr 320px',
        gap: spacing.lg,
        padding: `0 ${spacing.xl} ${spacing.xl}`,
        animation: 'fadeIn 0.6s ease-out'
      }}>
        
        {/* Columna principal */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.lg
        }}>
          {/* Estadísticas del post */}
          <PostStats 
            content={post.content}
            title={post.title}
            category={post.category}
            tags={post.tags}
          />

          {/* Información básica del post */}
          <div 
            className="section-card"
            style={{
              backgroundColor: isDarkMode ? colors.backgroundDarkSecondary : colors.white,
              padding: spacing.xl,
              borderRadius: borderRadius.lg,
              boxShadow: shadows.md,
              border: focusedSection === 'basic' ? `2px solid ${colors.secondary}` : 'none'
            }}
            onFocus={() => setFocusedSection('basic')}
            onBlur={() => setFocusedSection(null)}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: spacing.lg
            }}>
              <span style={{
                fontSize: '28px',
                marginRight: spacing.md,
                animation: 'bounce 2s infinite'
              }}>
                📋
              </span>
              <h2 style={{
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.bold,
                color: colors.primary,
                margin: 0
              }}>
                Información Básica
              </h2>
            </div>

            {/* Título */}
            <div style={{ marginBottom: spacing.lg }}>
              <label style={{
                display: 'block',
                marginBottom: spacing.sm,
                fontWeight: typography.fontWeight.semiBold,
                color: colors.textPrimary,
                fontSize: typography.fontSize.md
              }}>
                📝 Título *
              </label>
              <input
                type="text"
                name="title"
                value={post.title}
                onChange={handleChange}
                placeholder="Escribe un título atractivo..."
                className="input-field"
                style={{
                  width: '100%',
                  padding: spacing.md,
                  borderRadius: borderRadius.md,
                  border: `2px solid ${colors.gray200}`,
                  fontSize: typography.fontSize.lg,
                  backgroundColor: isDarkMode ? colors.backgroundDark : colors.white,
                  color: colors.textPrimary,
                  fontWeight: typography.fontWeight.medium,
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = colors.secondary;
                  e.target.style.backgroundColor = isDarkMode ? colors.backgroundDarkSecondary : '#f8f9fa';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = colors.gray200;
                  e.target.style.backgroundColor = isDarkMode ? colors.backgroundDark : colors.white;
                }}
              />
            </div>

            {/* Resumen */}
            <div style={{ marginBottom: spacing.lg }}>
              <label style={{
                display: 'block',
                marginBottom: spacing.sm,
                fontWeight: typography.fontWeight.semiBold,
                color: colors.textPrimary,
                fontSize: typography.fontSize.md
              }}>
                📄 Resumen
              </label>
              <textarea
                name="resumen"
                value={post.resumen}
                onChange={handleChange}
                placeholder="Breve descripción de tu publicación..."
                className="input-field"
                rows={3}
                style={{
                  width: '100%',
                  padding: spacing.md,
                  borderRadius: borderRadius.md,
                  border: `2px solid ${colors.gray200}`,
                  fontSize: typography.fontSize.md,
                  backgroundColor: isDarkMode ? colors.backgroundDark : colors.white,
                  color: colors.textPrimary,
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: '80px'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = colors.secondary;
                  e.target.style.backgroundColor = isDarkMode ? colors.backgroundDarkSecondary : '#f8f9fa';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = colors.gray200;
                  e.target.style.backgroundColor = isDarkMode ? colors.backgroundDark : colors.white;
                }}
              />
            </div>

            {/* Etiquetas */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: spacing.sm,
                fontWeight: typography.fontWeight.semiBold,
                color: colors.textPrimary,
                fontSize: typography.fontSize.md
              }}>
                🏷️ Etiquetas
              </label>
              <input
                type="text"
                name="tags"
                value={post.tags}
                onChange={handleChange}
                placeholder="Separadas por comas: educación, tecnología, innovación..."
                className="input-field"
                style={{
                  width: '100%',
                  padding: spacing.md,
                  borderRadius: borderRadius.md,
                  border: `2px solid ${colors.gray200}`,
                  fontSize: typography.fontSize.md,
                  backgroundColor: isDarkMode ? colors.backgroundDark : colors.white,
                  color: colors.textPrimary,
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = colors.secondary;
                  e.target.style.backgroundColor = isDarkMode ? colors.backgroundDarkSecondary : '#f8f9fa';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = colors.gray200;
                  e.target.style.backgroundColor = isDarkMode ? colors.backgroundDark : colors.white;
                }}
              />
            </div>
          </div>

          {/* Editor de contenido mejorado */}
          <div 
            className="section-card"
            style={{
              backgroundColor: isDarkMode ? colors.backgroundDarkSecondary : colors.white,
              borderRadius: borderRadius.lg,
              boxShadow: shadows.md,
              overflow: 'hidden',
              border: focusedSection === 'content' ? `2px solid ${colors.secondary}` : 'none'
            }}
            onFocus={() => setFocusedSection('content')}
            onBlur={() => setFocusedSection(null)}
          >
            <div style={{
              padding: spacing.xl,
              borderBottom: `1px solid ${colors.gray200}`
            }}>
              <ContentLabel />
            </div>
            
            <div style={{ 
              minHeight: '500px',
              position: 'relative'
            }}>
              <DualModeEditor
                content={post.content}
                onChange={handleEditorChange}
                initialMode={post.editorMode}
                onExport={exportToFile}
                onImport={importFile}
              />
            </div>
          </div>

          {/* Acciones principales */}
          <div style={{
            display: 'flex',
            gap: spacing.md,
            justifyContent: 'flex-end',
            padding: spacing.md,
            animation: 'slideInUp 0.7s ease-out'
          }}>
            <button
              onClick={saveDraft}
              disabled={isSaving}
              style={{
                ...styles.actionButton,
                ...styles.saveButton,
                backgroundColor: colors.gray100,
                color: colors.textPrimary,
                border: `1px solid ${colors.gray300}`,
                display: 'flex',
                alignItems: 'center',
                gap: spacing.xs
              }}
            >
              {isSaving ? '💾 Guardando...' : '💾 Guardar Borrador'}
            </button>

            <button
              onClick={publishPost}
              disabled={isPublishing || !post.title || !post.content || !post.category}
              style={{
                ...styles.actionButton,
                ...styles.publishButton,
                backgroundColor: colors.primary,
                color: colors.white,
                opacity: (!post.title || !post.content || !post.category) ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: spacing.xs
              }}
            >
              {isPublishing ? '🚀 Publicando...' : '🚀 Publicar'}
            </button>
          </div>
        </div>

        {/* Barra lateral derecha */}
        {!isExpanded && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.lg,
            animation: 'slideInLeft 0.6s ease-out'
          }}>
            {/* Consejos de escritura */}
            <WritingTips content={post.content} category={post.category} />
            
            {/* Metadatos del post */}
            {renderPostMetadata()}
            
            {/* Imagen de portada */}
            <div 
              className="section-card"
              style={{
                backgroundColor: isDarkMode ? colors.backgroundDarkSecondary : colors.white,
                padding: spacing.lg,
                borderRadius: borderRadius.lg,
                boxShadow: shadows.md
              }}
            >
              <h3 style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.semiBold,
                marginBottom: spacing.md,
                color: colors.primary,
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm
              }}>
                🖼️ Imagen de Portada
              </h3>
              <CoverImageUploader
                coverImage={post.coverImage}
                coverImagePreview={post.coverImagePreview}
                onImageChange={handleImageChange}
              />
            </div>

            {/* Acciones de importar/exportar */}
            <div 
              className="section-card"
              style={{
                backgroundColor: isDarkMode ? colors.backgroundDarkSecondary : colors.white,
                padding: spacing.lg,
                borderRadius: borderRadius.lg,
                boxShadow: shadows.md
              }}
            >
              <h3 style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.semiBold,
                marginBottom: spacing.md,
                color: colors.primary,
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm
              }}>
                📁 Gestión de Archivos
              </h3>
              <ImportExportActions
                onExport={exportToFile}
                onImport={importFile}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mensaje de estado */}
      {saveMessage && (
        <StatusMessage
          message={saveMessage}
          type={saveMessage.includes('Error') ? 'error' : 'success'}
          onClose={() => setSaveMessage(null)}
        />
      )}
    </div>
  );
};

export default PostEditor;