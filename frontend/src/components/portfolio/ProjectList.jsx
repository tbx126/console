import { useState, useEffect } from 'react';
import portfolioApi from '../../services/portfolioApi';

const ProjectList = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await portfolioApi.getProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'completed':
        return 'bg-blue-100 text-blue-700';
      case 'on-hold':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading projects...</div>;
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No projects yet. Add your first project!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {projects.map(project => (
        <div
          key={project.id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">{project.name}</h3>
              <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${getStatusColor(project.status)}`}>
                {project.status}
              </span>
            </div>
            {project.url && (
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                View →
              </a>
            )}
          </div>

          <p className="text-gray-600 text-sm mb-3">{project.description}</p>

          {project.technologies.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {project.technologies.map((tech, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                >
                  {tech}
                </span>
              ))}
            </div>
          )}

          {project.achievements.length > 0 && (
            <div className="mt-3">
              <div className="text-sm font-medium text-gray-700 mb-1">Achievements:</div>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                {project.achievements.map((achievement, index) => (
                  <li key={index}>{achievement}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-3 text-xs text-gray-500">
            {new Date(project.start_date).toLocaleDateString()}
            {project.end_date && ` - ${new Date(project.end_date).toLocaleDateString()}`}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProjectList;
